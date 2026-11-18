import type { SupabaseClient } from "@supabase/supabase-js";
import { esquemaContenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";
import {
	crearEsquemaGuion,
	esquemaInstruccionGuion,
	type Guion,
	type InstruccionGuion,
} from "../../../../backend/supabase/functions/_shared/esquemas/guion";
import type { Database, Json } from "../../tipos/database.types";

/** Fila original; los textos se validan antes de abrir el editor. */
export type GuionGuardado = Database["public"]["Tables"]["guiones"]["Row"];
/** Estado persistente, sujeto a los disparadores de la base. */
export type EstadoGuion = GuionGuardado["estado"];
/** Las indicaciones se muestran aparte del texto que se pega en la herramienta. */
export type PromptVideo = {
	herramienta: "avatar" | "escenas" | null;
	texto_copiar: string;
	estilo_general: string;
	escenas: { orden: number; texto: string; indicaciones: string }[];
};

function objeto(valor: unknown): Record<string, unknown> {
	if (typeof valor !== "object" || valor === null || Array.isArray(valor))
		throw new Error("No pudimos leer la respuesta. Inténtalo de nuevo.");
	return valor as Record<string, unknown>;
}

function errorEscritura(error: { code: string }, accion = "guardar") {
	if (error.code === "42501")
		return new Error(
			"Tu sesión no tiene permiso para cambiar este guion. Vuelve a entrar al panel.",
		);
	if (error.code === "P0001")
		return new Error(
			"El guion ya no permite ese cambio. Recarga la lista antes de continuar.",
		);
	return new Error(`No pudimos ${accion} el guion. Inténtalo de nuevo.`);
}

function leerPrompt(valor: unknown): PromptVideo {
	const datos = objeto(valor);
	if (typeof datos.texto_copiar !== "string")
		throw new Error("El prompt salió incompleto. Inténtalo de nuevo.");
	return {
		herramienta:
			datos.herramienta === "avatar" || datos.herramienta === "escenas"
				? datos.herramienta
				: null,
		texto_copiar: datos.texto_copiar,
		estilo_general:
			typeof datos.estilo_general === "string" ? datos.estilo_general : "",
		escenas: Array.isArray(datos.escenas)
			? datos.escenas.map((valor, indice) => {
					const escena = objeto(valor);
					return {
						orden: indice + 1,
						texto:
							typeof escena.texto_avatar === "string"
								? escena.texto_avatar
								: typeof escena.descripcion === "string"
									? escena.descripcion
									: "",
						indicaciones:
							typeof escena.indicaciones === "string"
								? escena.indicaciones
								: "",
					};
				})
			: [],
	};
}

/** Recupera la instrucción sin enviar el nombre histórico al contrato estricto de IA. */
export function leerGuionGuardado(fila: GuionGuardado) {
	const { producto_nombre, ...entrada } = objeto(fila.instruccion);
	const instruccion = esquemaInstruccionGuion.parse(entrada);
	return {
		instruccion,
		productoNombre:
			typeof producto_nombre === "string"
				? producto_nombre
				: (instruccion.producto_id ?? "Guion general"),
		generado: crearEsquemaGuion(instruccion.duracion_s).parse(fila.generado),
		editado: crearEsquemaGuion(instruccion.duracion_s).parse(fila.editado),
	};
}

/** Invoca IA mediante Supabase, que conserva la URL y renueva la sesión en cada petición. */
export async function invocarFuncionIa(
	cliente: SupabaseClient<Database>,
	ruta: string,
	body: object,
	generico: string,
	signal?: AbortSignal,
) {
	const { data: sesion, error: errorSesion } = await cliente.auth.getSession();
	if (errorSesion || !sesion.session)
		throw new Error("Tu sesión venció. Vuelve a entrar al panel.");
	const respuesta = await cliente.functions
		.invoke<unknown>(`ia/${ruta}`, {
			body,
			signal,
			headers: { Authorization: `Bearer ${sesion.session.access_token}` },
		})
		.catch(() => {
			throw new Error(generico);
		});
	if (respuesta.error) {
		let mensaje = generico;
		if (respuesta.error.context instanceof Response) {
			try {
				const datos = objeto(await respuesta.error.context.json());
				if (typeof datos.mensaje === "string") mensaje = datos.mensaje;
			} catch {
				/* Los errores de red pueden carecer de JSON. */
			}
		}
		throw new Error(mensaje);
	}
	return respuesta.data;
}

/** CRUD con RLS y llamadas a IA; nunca escribe prompts ni publica contenido desde el cliente. */
export function crearServicioGuiones(cliente: SupabaseClient<Database>) {
	const conflicto =
		"El guion cambió o ya no está disponible. Recarga la lista antes de continuar.";
	async function actualizar(
		fila: GuionGuardado,
		cambios: { estado?: EstadoGuion; editado?: Json },
	) {
		const { data, error } = await cliente
			.from("guiones")
			.update(cambios)
			.eq("id", fila.id)
			.eq("estado", fila.estado)
			.eq("actualizado_en", fila.actualizado_en)
			.select("*")
			.maybeSingle();
		if (error) throw errorEscritura(error);
		if (!data) throw new Error(conflicto);
		return data;
	}
	return {
		async cargar() {
			const [version, guiones] = await Promise.all([
				cliente
					.from("versiones_contenido")
					.select("json")
					.eq("estado", "publicada")
					.maybeSingle(),
				cliente
					.from("guiones")
					.select("*")
					.order("creado_en", { ascending: false }),
			]);
			if (version.error || guiones.error)
				throw new Error(
					"No pudimos cargar los guiones y productos. Inténtalo de nuevo.",
				);
			const productos = version.data
				? esquemaContenido
						.parse(version.data.json)
						.productos.filter((p) => p.vigente)
				: [];
			return { productos, guiones: guiones.data ?? [] };
		},
		async guardar(
			instruccion: InstruccionGuion,
			productoNombre: string,
			generado: Guion,
			editado: Guion,
			fila: GuionGuardado | null,
		) {
			const resultado = crearEsquemaGuion(instruccion.duracion_s).safeParse(
				editado,
			);
			if (!resultado.success) {
				const problema = resultado.error.issues[0];
				const nombres: Record<string, string> = {
					titulo: "Título",
					gancho: "Gancho",
					escenas: "Escenas",
					inicio_s: "Inicio",
					fin_s: "Fin",
					que_se_ve: "Qué se ve",
					texto_pantalla: "Texto en pantalla",
					voz: "Voz o diálogo",
					llamado_accion: "Llamado a la acción",
					texto_publicacion: "Texto de la publicación",
					musica_sugerida: "Música sugerida",
					notas_produccion: "Notas de producción",
				};
				const campo = problema.path
					.map((p) =>
						typeof p === "number" ? p + 1 : (nombres[String(p)] ?? "el campo"),
					)
					.join(" · ");
				const detalle =
					problema.code === "custom"
						? problema.message
						: problema.path[0] === "escenas"
							? "revisa los tiempos y completa los textos de cada escena."
							: "completa el campo y respeta su longitud máxima.";
				throw new Error(`Revisa ${campo}: ${detalle}`);
			}
			if (fila) {
				if (fila.estado !== "borrador")
					throw new Error(
						"Primero elige Editar o Recuperar para volver a borrador.",
					);
				return actualizar(fila, { editado: resultado.data });
			}
			const { data, error } = await cliente
				.from("guiones")
				.insert({
					instruccion: {
						...esquemaInstruccionGuion.parse(instruccion),
						producto_nombre: productoNombre,
					},
					generado: crearEsquemaGuion(instruccion.duracion_s).parse(generado),
					editado: resultado.data,
					estado: "borrador",
				})
				.select("*")
				.maybeSingle();
			if (error) throw errorEscritura(error);
			if (!data)
				throw new Error("No pudimos guardar el guion. Inténtalo de nuevo.");
			return data;
		},
		cambiarEstado: (fila: GuionGuardado, estado: EstadoGuion) =>
			actualizar(fila, { estado }),
		async eliminar(fila: GuionGuardado) {
			const { data, error } = await cliente
				.from("guiones")
				.delete()
				.eq("id", fila.id)
				.eq("estado", fila.estado)
				.eq("actualizado_en", fila.actualizado_en)
				.select("id")
				.maybeSingle();
			if (error) throw errorEscritura(error, "eliminar");
			if (!data) throw new Error(conflicto);
		},
		async leerPrompt(id: string) {
			const { data, error } = await cliente
				.from("prompts_video")
				.select("contenido")
				.eq("guion_id", id)
				.maybeSingle();
			if (error)
				throw new Error("No pudimos cargar el prompt. Inténtalo de nuevo.");
			return data ? leerPrompt(data.contenido) : null;
		},
		async generarPrompt(
			fila: GuionGuardado,
			herramienta: "avatar" | "escenas",
		) {
			if (fila.estado !== "aprobado")
				throw new Error(
					"Aprueba el guion antes de generar el prompt de video.",
				);
			return leerPrompt(
				objeto(
					await invocarFuncionIa(
						cliente,
						"prompt-video",
						{ guion_id: fila.id, herramienta },
						"No se pudo generar el prompt. Inténtalo de nuevo en unos minutos.",
					),
				).prompt,
			);
		},
	};
}

/** Texto legible que conserva todas las partes y tiempos del guion al copiar. */
export function textoGuion(guion: Guion) {
	return [
		guion.titulo,
		`Gancho: ${guion.gancho}`,
		...guion.escenas.map(
			(e, i) =>
				`Escena ${i + 1} (${e.inicio_s}–${e.fin_s} s)\nQué se ve: ${e.que_se_ve}\nTexto en pantalla: ${e.texto_pantalla}\nVoz o diálogo: ${e.voz}`,
		),
		`Llamado a la acción: ${guion.llamado_accion}`,
		`Texto de la publicación: ${guion.texto_publicacion}`,
		`Música sugerida: ${guion.musica_sugerida}`,
		`Notas de producción: ${guion.notas_produccion}`,
	].join("\n\n");
}
