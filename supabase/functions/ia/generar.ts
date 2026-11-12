import {
	crearEsquemaGuion,
	type DuracionVideo,
	esquemaJsonGuion,
	type Guion,
} from "../_shared/esquemas/guion.ts";
import type { PromptGuion } from "./instrucciones.ts";

/**
 * Cadena de generación del guion con sus fallos (DT-01, secciones 25 y 25.2).
 * Hace como máximo dos llamadas de 30 s, para que el administrador no espere
 * más de un minuto: si se agota el cupo diario, una con el modelo de respaldo;
 * si la respuesta no cumple el esquema, otra con el mismo modelo.
 */

/** Códigos de error del agente (DT-01, sección 23). */
export type CodigoErrorIa =
	| "ia_tiempo"
	| "ia_limite_minuto"
	| "ia_cupo"
	| "ia_estructura"
	| "ia_bloqueado";

/** Estado HTTP y mensaje al administrador de cada fallo (sección 25.2). */
export const RESPUESTAS_ERROR_IA: Record<
	CodigoErrorIa,
	{ estado: number; mensaje: string }
> = {
	ia_tiempo: {
		estado: 504,
		mensaje: "No se pudo generar el guion. Inténtalo de nuevo en unos minutos.",
	},
	ia_limite_minuto: {
		estado: 429,
		mensaje: "Hay muchas solicitudes. Espera un minuto e inténtalo de nuevo.",
	},
	ia_cupo: {
		estado: 429,
		mensaje: "Se alcanzó el límite de hoy. Inténtalo mañana.",
	},
	ia_estructura: {
		estado: 502,
		mensaje: "El guion salió incompleto. Inténtalo de nuevo.",
	},
	ia_bloqueado: {
		estado: 422,
		mensaje:
			"No se pudo generar con esas instrucciones. Prueba a escribirlas de otra forma.",
	},
};

/** Fallo del agente ya clasificado. */
export class ErrorIa extends Error {
	constructor(readonly codigo: CodigoErrorIa) {
		super(codigo);
		this.name = "ErrorIa";
	}
}

/** Lo que devuelve el proveedor: el texto JSON y si bloqueó el contenido. */
export type RespuestaModelo = { texto: string | undefined; bloqueado: boolean };

/** Una llamada al proveedor de IA. La implementación real está en `gemini.ts`. */
export type LlamarModelo = (peticion: {
	modelo: string;
	prompt: PromptGuion;
	esquemaJson: Record<string, unknown>;
	senal: AbortSignal;
}) => Promise<RespuestaModelo>;

/** Datos para generar un guion. */
export type OpcionesGeneracion = {
	llamar: LlamarModelo;
	modeloPrincipal: string;
	modeloRespaldo: string;
	prompt: PromptGuion;
	duracion: DuracionVideo;
	/** Espera máxima por llamada; 30 s por defecto. */
	esperaMs?: number;
};

/**
 * Genera y valida el guion.
 * @returns el guion y el modelo que lo generó.
 * @throws {ErrorIa} con el código del fallo de la sección 25.2.
 */
export async function generarGuion(
	opciones: OpcionesGeneracion,
): Promise<{ guion: Guion; modelo: string }> {
	const { modeloPrincipal, modeloRespaldo } = opciones;
	try {
		return await intentar(opciones, modeloPrincipal);
	} catch (error) {
		if (!(error instanceof ErrorIa)) throw error;
		if (error.codigo === "ia_estructura") {
			return intentar(opciones, modeloPrincipal);
		}
		if (error.codigo === "ia_cupo") {
			return intentar(opciones, modeloRespaldo);
		}
		throw error;
	}
}

async function intentar(
	{ llamar, prompt, duracion, esperaMs = 30_000 }: OpcionesGeneracion,
	modelo: string,
): Promise<{ guion: Guion; modelo: string }> {
	let respuesta: RespuestaModelo;
	try {
		respuesta = await llamar({
			modelo,
			prompt,
			esquemaJson: esquemaJsonGuion(),
			senal: AbortSignal.timeout(esperaMs),
		});
	} catch (error) {
		throw new ErrorIa(clasificarErrorProveedor(error));
	}

	if (respuesta.bloqueado) throw new ErrorIa("ia_bloqueado");

	const resultado = crearEsquemaGuion(duracion).safeParse(
		leerJson(respuesta.texto),
	);
	if (!resultado.success) throw new ErrorIa("ia_estructura");
	return { guion: resultado.data, modelo };
}

/**
 * Clasifica un error del proveedor. Un 429 es cupo diario si el mensaje cita una
 * cuota por día y límite por minuto en otro caso; el resto (tiempo agotado,
 * errores de red o del servidor) cuenta como «no responde o da error».
 */
export function clasificarErrorProveedor(error: unknown): CodigoErrorIa {
	const estado =
		typeof error === "object" && error !== null && "status" in error
			? error.status
			: undefined;
	if (estado !== 429) return "ia_tiempo";

	const mensaje = error instanceof Error ? error.message : String(error);
	// Gemini identifica la cuota en el mensaje, por ejemplo
	// "GenerateRequestsPerDayPerProjectPerModel-FreeTier".
	return /per\s?day/i.test(mensaje) ? "ia_cupo" : "ia_limite_minuto";
}

function leerJson(texto: string | undefined): unknown {
	if (texto === undefined) return undefined;
	try {
		return JSON.parse(texto);
	} catch {
		return undefined;
	}
}
