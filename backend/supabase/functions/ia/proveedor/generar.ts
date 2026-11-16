import {
	crearEsquemaGuion,
	type DuracionVideo,
	esquemaJsonGuion,
	type Guion,
} from "../../_shared/esquemas/guion.ts";

/**
 * Cadena de generación del guion con sus fallos (DT-01, secciones 25 y 25.2).
 * Si la respuesta no cumple el esquema, reintenta una vez con el mismo modelo;
 * si el cupo diario del principal está agotado o el principal está saturado
 * (503), en la primera llamada o en ese reintento, pasa una vez al modelo de
 * respaldo. Como mucho hay dos esperas de 30 s: la llamada que choca con el
 * cupo o con la saturación responde al instante.
 */

/** Mensajes para el modelo. */
export type PromptGuion = { sistema: string; usuario: string };

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

/**
 * Fallo del agente ya clasificado. `estadoProveedor` es el código HTTP que
 * devolvió Gemini, si lo hubo; sirve para el registro (NT-06, punto 2).
 */
export class ErrorIa extends Error {
	constructor(
		readonly codigo: CodigoErrorIa,
		readonly estadoProveedor?: number,
		/** Reglas que no cumplió una respuesta con `ia_estructura`, para el reintento. */
		readonly problemas: string[] = [],
	) {
		super(codigo);
		this.name = "ErrorIa";
	}
}

/** Código HTTP con el que Gemini indica que el modelo está saturado. */
const ESTADO_SATURADO = 503;

/**
 * Datos del registro de un fallo (DD-20): fecha, tipo y, si lo hay, el código
 * HTTP del proveedor. Nunca el mensaje del proveedor, la clave ni el formulario.
 */
export function datosRegistroFallo(
	tipo: string,
	estadoProveedor?: number,
	fecha: Date = new Date(),
): { fecha: string; tipo: string; estado_proveedor?: number } {
	return {
		fecha: fecha.toISOString(),
		tipo,
		...(estadoProveedor === undefined
			? {}
			: { estado_proveedor: estadoProveedor }),
	};
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
	const { salida, modelo } = await generarSalida({
		...opciones,
		esquemaJson: esquemaJsonGuion(),
		validar: (datos) => crearEsquemaGuion(opciones.duracion).safeParse(datos),
	});
	return { guion: salida, modelo };
}

/** Opciones comunes a las dos salidas estructuradas, con validación inyectada. */
export type OpcionesSalida<T> = Omit<OpcionesGeneracion, "duracion"> & {
	esquemaJson: Record<string, unknown>;
	/** Compatible con `safeParse` de Zod: los `issues` alimentan el aviso del reintento. */
	validar: (datos: unknown) =>
		| { success: true; data: T }
		| {
				success: false;
				error?: { issues: { path: PropertyKey[]; message: string }[] };
		  };
};

/** Máximo de reglas que se citan en el aviso del reintento. */
const MAXIMO_PROBLEMAS_AVISO = 5;

/** Ejecuta la cadena de modelos y el único reintento por estructura de la sección 25.2. */
export async function generarSalida<T>(
	opciones: OpcionesSalida<T>,
): Promise<{ salida: T; modelo: string }> {
	const { modeloPrincipal, modeloRespaldo } = opciones;
	let reintento: OpcionesSalida<T>;
	try {
		return await intentar(opciones, modeloPrincipal);
	} catch (error) {
		if (!(error instanceof ErrorIa && error.codigo === "ia_estructura")) {
			if (pasaAlRespaldo(error)) {
				return intentar(opciones, modeloRespaldo);
			}
			throw error;
		}
		// Repetir la misma petición suele dar el mismo fallo (por ejemplo, el modelo
		// cuenta mal los caracteres): el reintento le dice qué regla no cumplió.
		reintento = {
			...opciones,
			prompt: conAviso(opciones.prompt, error.problemas),
		};
	}

	// Reintento por estructura. Si en él se agota el cupo del principal o este
	// se satura, la sección 25.2 pide pasar al respaldo igual que en la primera llamada.
	try {
		return await intentar(reintento, modeloPrincipal);
	} catch (error) {
		if (pasaAlRespaldo(error)) {
			return intentar(reintento, modeloRespaldo);
		}
		throw error;
	}
}

// Los mensajes vienen de los esquemas propios (números y reglas), no del texto
// generado, así que no abren una vía para que el modelo se dé órdenes a sí mismo.
function conAviso(prompt: PromptGuion, problemas: string[]): PromptGuion {
	const lista = (
		problemas.length > 0
			? problemas
			: ["La respuesta no tenía la estructura pedida"]
	)
		.slice(0, MAXIMO_PROBLEMAS_AVISO)
		.map((problema) => `- ${problema}`)
		.join("\n");
	return {
		sistema: prompt.sistema,
		usuario: `${prompt.usuario}\n\nTu respuesta anterior no cumplió estas reglas. Corrígelas y devuelve de nuevo el JSON completo:\n${lista}`,
	};
}

function esErrorIa(error: unknown, codigo: CodigoErrorIa): boolean {
	return error instanceof ErrorIa && error.codigo === codigo;
}

// Solo el cupo diario y la saturación tienen sentido con otro modelo: el límite
// por minuto es del proyecto y un 400 o 404 se repetiría igual (NT-06, punto 2).
function pasaAlRespaldo(error: unknown): boolean {
	return (
		esErrorIa(error, "ia_cupo") ||
		(error instanceof ErrorIa && error.estadoProveedor === ESTADO_SATURADO)
	);
}

async function intentar<T>(
	{
		llamar,
		prompt,
		esquemaJson,
		validar,
		esperaMs = 30_000,
	}: OpcionesSalida<T>,
	modelo: string,
): Promise<{ salida: T; modelo: string }> {
	let respuesta: RespuestaModelo;
	try {
		respuesta = await llamar({
			modelo,
			prompt,
			esquemaJson,
			senal: AbortSignal.timeout(esperaMs),
		});
	} catch (error) {
		throw new ErrorIa(
			clasificarErrorProveedor(error),
			estadoDelProveedor(error),
		);
	}

	if (respuesta.bloqueado) throw new ErrorIa("ia_bloqueado");

	const datos = leerJson(respuesta.texto);
	if (datos === undefined) {
		throw new ErrorIa("ia_estructura", undefined, [
			"La respuesta no era un JSON válido con la estructura pedida",
		]);
	}
	const resultado = validar(datos);
	if (!resultado.success) {
		throw new ErrorIa(
			"ia_estructura",
			undefined,
			(resultado.error?.issues ?? []).map((problema) =>
				problema.path.length > 0
					? `${problema.path.map(String).join(".")}: ${problema.message}`
					: problema.message,
			),
		);
	}
	return { salida: resultado.data, modelo };
}

/**
 * Clasifica un error del proveedor. Un 429 es cupo diario si el mensaje cita una
 * cuota por día y límite por minuto en otro caso; el resto (tiempo agotado,
 * errores de red o del servidor) cuenta como «no responde o da error».
 */
export function clasificarErrorProveedor(error: unknown): CodigoErrorIa {
	if (estadoDelProveedor(error) !== 429) return "ia_tiempo";

	const mensaje = error instanceof Error ? error.message : String(error);
	// Gemini identifica la cuota en el mensaje, por ejemplo
	// "GenerateRequestsPerDayPerProjectPerModel-FreeTier".
	return /per\s?day/i.test(mensaje) ? "ia_cupo" : "ia_limite_minuto";
}

/**
 * Código HTTP de un error del proveedor (`status` de `ApiError` en
 * @google/genai), o `undefined` si no lo trae: tiempo agotado o fallo de red.
 */
export function estadoDelProveedor(error: unknown): number | undefined {
	if (typeof error !== "object" || error === null || !("status" in error)) {
		return undefined;
	}
	return typeof error.status === "number" ? error.status : undefined;
}

function leerJson(texto: string | undefined): unknown {
	if (texto === undefined) return undefined;
	try {
		return JSON.parse(texto);
	} catch {
		return undefined;
	}
}
