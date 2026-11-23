import type { SupabaseClient } from "@supabase/supabase-js";
import { esquemaContenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";
import type { Database } from "../../tipos/database.types";

/** Datos conservados por el panel para comprobar la revisión antes de escribir. */
export type VersionContenido = Pick<
	Database["public"]["Tables"]["versiones_contenido"]["Row"],
	"id" | "estado" | "revision" | "json" | "version_contrato" | "publicada_en"
>;

/** Las tres versiones se leen juntas, sin recurrir al respaldo del sitio público. */
export type EstadoVersiones = {
	publicada: VersionContenido | null;
	anterior: VersionContenido | null;
	borrador: VersionContenido | null;
};

const COLUMNAS = "id,estado,revision,json,version_contrato,publicada_en";
const CONFLICTO =
	"Alguien más cambió este contenido. Recarga para ver la última versión.";
const ERROR_ESCRITURA = "No pudimos guardar los cambios. Inténtalo de nuevo.";
const ERROR_FUNCION =
	"No se pudo publicar. El sitio sigue igual. Inténtalo de nuevo.";

function validarContenido(json: unknown) {
	const resultado = esquemaContenido.safeParse(json);
	if (!resultado.success) {
		const problema = resultado.error.issues[0];
		const campo =
			problema.path
				.map((parte) =>
					parte === "version_contrato"
						? "versión del contenido"
						: typeof parte === "number"
							? `elemento ${parte + 1}`
							: String(parte).replaceAll("_", " "),
				)
				.join(" · ") || "contenido";
		throw new Error(
			`Revisa el campo ${campo}: el valor no es válido. Corrígelo antes de guardar o publicar.`,
		);
	}
	return resultado.data;
}

/** Operaciones del panel con RLS; publicar y restaurar siempre pasan por la función. */
export function crearServicioVersiones(cliente: SupabaseClient<Database>) {
	async function invocar(
		ruta: "publicar" | "restaurar",
		body: Record<string, unknown>,
	) {
		const { data, error } = await cliente.functions
			.invoke<unknown>(`panel/${ruta}`, {
				body,
			})
			.catch(() => {
				throw new Error(ERROR_FUNCION);
			});
		if (error) {
			let mensaje = ERROR_FUNCION;
			if (error.context instanceof Response) {
				try {
					const respuesta: unknown = await error.context.json();
					if (
						typeof respuesta === "object" &&
						respuesta !== null &&
						"mensaje" in respuesta &&
						typeof respuesta.mensaje === "string"
					)
						mensaje = respuesta.mensaje;
				} catch {
					// Un fallo de red puede llegar sin cuerpo JSON.
				}
			}
			throw new Error(mensaje);
		}
		if (
			typeof data !== "object" ||
			data === null ||
			!("publicada_en" in data) ||
			typeof data.publicada_en !== "string"
		)
			throw new Error(ERROR_FUNCION);
		return data.publicada_en;
	}

	return {
		async leer(): Promise<EstadoVersiones> {
			const { data, error } = await cliente
				.from("versiones_contenido")
				.select(COLUMNAS);
			if (error)
				throw new Error("No pudimos cargar las versiones. Inténtalo de nuevo.");
			return {
				publicada: data.find((fila) => fila.estado === "publicada") ?? null,
				anterior: data.find((fila) => fila.estado === "anterior") ?? null,
				borrador: data.find((fila) => fila.estado === "borrador") ?? null,
			};
		},
		async editar(publicada: VersionContenido): Promise<VersionContenido> {
			const { data, error } = await cliente
				.from("versiones_contenido")
				.insert({
					estado: "borrador",
					json: publicada.json,
					version_contrato: publicada.version_contrato,
				})
				.select(COLUMNAS)
				.maybeSingle();
			if (error)
				throw new Error(error.code === "23505" ? CONFLICTO : ERROR_ESCRITURA);
			if (!data) throw new Error(CONFLICTO);
			return data;
		},
		async guardar(
			borrador: VersionContenido,
			json: unknown,
		): Promise<VersionContenido> {
			const contenido = validarContenido(json);
			const { data, error } = await cliente
				.from("versiones_contenido")
				.update({
					json: contenido,
					version_contrato: contenido.version_contrato,
				})
				.eq("estado", "borrador")
				.eq("id", borrador.id)
				.eq("revision", borrador.revision)
				.select(COLUMNAS)
				.maybeSingle();
			if (error) throw new Error(ERROR_ESCRITURA);
			if (!data) throw new Error(CONFLICTO);
			return data;
		},
		async descartar(borrador: VersionContenido): Promise<void> {
			const { data, error } = await cliente
				.from("versiones_contenido")
				.delete()
				.eq("estado", "borrador")
				.eq("id", borrador.id)
				.eq("revision", borrador.revision)
				.select("id")
				.maybeSingle();
			if (error)
				throw new Error(
					"No pudimos descartar los cambios. Inténtalo de nuevo.",
				);
			if (!data) throw new Error(CONFLICTO);
		},
		async publicar(
			borrador: VersionContenido,
			aprobado: boolean,
		): Promise<string> {
			validarContenido(borrador.json);
			return invocar("publicar", {
				revision: borrador.revision,
				contenido_real: aprobado,
			});
		},
		restaurar: () => invocar("restaurar", {}),
	};
}
