import type { SupabaseClient } from "@supabase/supabase-js";
import {
	crearEsquemaGuion,
	esquemaInstruccionGuion,
} from "../_shared/esquemas/guion.ts";
import {
	crearEsquemaPromptVideo,
	esquemaJsonPromptVideo,
	esquemaPeticionPromptVideo,
	type HerramientaVideo,
	type SalidaPromptVideo,
} from "../_shared/esquemas/prompt-video.ts";
import {
	leerCuerpoJson,
	responderCuerpoInvalido,
	responderError,
	responderJson,
} from "../_shared/http.ts";
import type { ManejadorRuta } from "../_shared/servidor.ts";
import {
	ErrorIa,
	generarSalida,
	type LlamarModelo,
	RESPUESTAS_ERROR_IA,
} from "./generar.ts";
import { armarPromptVideo } from "./instrucciones-video.ts";

/** Dependencias de generación y acceso a datos con el JWT del administrador. */
export type OpcionesPromptVideo = {
	crearCliente: (jwt: string) => SupabaseClient;
	llamar: LlamarModelo;
	modeloPrincipal: string;
	modeloRespaldo: string;
};

/** Atiende la generación y conservación de un prompt desde un guion aprobado. */
export function crearRutaPromptVideo(
	opciones: OpcionesPromptVideo,
): ManejadorRuta {
	return async ({ peticion, jwt, cors }) => {
		const cuerpo = await leerCuerpoJson(peticion);
		if (!cuerpo.valido) return responderCuerpoInvalido(cuerpo.motivo, cors);
		const entrada = esquemaPeticionPromptVideo.safeParse(cuerpo.datos);
		if (!entrada.success)
			return responderError(
				400,
				"datos_no_validos",
				"Revisa los campos del formulario.",
				cors,
			);
		const { guion_id, herramienta } = entrada.data;
		let tipoFallo = "lectura_prompt_video";
		try {
			const cliente = opciones.crearCliente(jwt);
			const { data, error } = await cliente
				.from("guiones")
				.select("editado,instruccion,estado")
				.eq("id", guion_id)
				.maybeSingle();
			if (error) throw new Error(tipoFallo);
			if (!data) return sinGuion(cors);
			if (data.estado !== "aprobado") return noAprobado(cors);
			// La instrucción guardada también contiene el nombre del producto (DT-01, 19.1).
			const instruccion = esquemaInstruccionGuion
				.pick({ red: true, duracion_s: true })
				.strip()
				.safeParse(data.instruccion);
			if (!instruccion.success) throw new Error(tipoFallo);
			const guion = crearEsquemaGuion(instruccion.data.duracion_s).safeParse(
				data.editado,
			);
			if (!guion.success) throw new Error(tipoFallo);
			const esquema = crearEsquemaPromptVideo(
				herramienta,
				guion.data,
				instruccion.data.duracion_s,
			);
			const { salida, modelo } = await generarSalida<SalidaPromptVideo>({
				llamar: opciones.llamar,
				modeloPrincipal: opciones.modeloPrincipal,
				modeloRespaldo: opciones.modeloRespaldo,
				prompt: armarPromptVideo(herramienta, guion.data, instruccion.data),
				esquemaJson: esquemaJsonPromptVideo(herramienta),
				validar: (datos) => esquema.safeParse(datos),
			});
			const prompt = {
				herramienta,
				...salida,
				texto_copiar: textoParaCopiar(
					herramienta,
					salida,
					instruccion.data.duracion_s,
				),
			};
			tipoFallo = "guardado_prompt_video";
			const { error: errorGuardado } = await cliente
				.from("prompts_video")
				.upsert({ guion_id, contenido: prompt }, { onConflict: "guion_id" });
			if (errorGuardado?.code === "P0001") return noAprobado(cors);
			if (errorGuardado?.code === "23503") return sinGuion(cors);
			if (errorGuardado) throw new Error(tipoFallo);
			return responderJson(200, { prompt, modelo }, cors);
		} catch (error) {
			// DD-20: ningún mensaje del proveedor o de Postgres llega al registro.
			const tipo = error instanceof ErrorIa ? error.codigo : tipoFallo;
			console.error(JSON.stringify({ fecha: new Date().toISOString(), tipo }));
			if (error instanceof ErrorIa) {
				const { estado, mensaje } = RESPUESTAS_ERROR_IA[error.codigo];
				return responderError(
					estado,
					error.codigo,
					mensaje
						.replaceAll("el guion", "el prompt")
						.replaceAll("El guion", "El prompt"),
					cors,
				);
			}
			return responderError(
				500,
				"error_interno",
				"No se pudo generar el prompt. Inténtalo de nuevo en unos minutos.",
				cors,
			);
		}
	};
}

function sinGuion(cors: Record<string, string>) {
	return responderError(
		404,
		"guion_no_encontrado",
		"Ese guion no existe.",
		cors,
	);
}

function noAprobado(cors: Record<string, string>) {
	return responderError(
		409,
		"guion_no_aprobado",
		"Primero aprueba el guion.",
		cors,
	);
}

function textoParaCopiar(
	herramienta: HerramientaVideo,
	salida: SalidaPromptVideo,
	duracion: number,
): string {
	const textos = salida.escenas.map((escena) =>
		"texto_avatar" in escena ? escena.texto_avatar : escena.descripcion,
	);
	return herramienta === "avatar"
		? textos.join("\n\n")
		: [
				`Video vertical 9:16 de ${duracion} segundos`,
				salida.estilo_general,
				...textos,
			].join("\n\n");
}
