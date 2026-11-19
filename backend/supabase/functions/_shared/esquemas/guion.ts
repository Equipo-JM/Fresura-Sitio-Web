import { z } from "zod";

/**
 * Esquemas del agente de IA: la instrucción que llena el administrador y el
 * guion que devuelve el modelo (DT-01, secciones 25 y 25.1; `datos/agente-ia.json`).
 */

/** Duraciones admitidas del video, en segundos. */
export const DURACIONES_VIDEO = [15, 30, 60] as const;

/** Duración del video, en segundos. */
export type DuracionVideo = (typeof DURACIONES_VIDEO)[number];

/**
 * Fondos reales para el video de la presentadora en D-ID
 * (`/marca/fondo-presentadora-{clave}.jpg`). `cafeteria` es el general.
 */
export const FONDOS_PRESENTADORA = [
	"cafeteria",
	"vitrina",
	"fresas",
	"festivo",
	"flores",
	"fresal",
	"terraza",
	"noche",
	"navidad",
	"rosado",
	"corazones",
] as const;

/** Clave de un fondo de la presentadora. */
export type FondoPresentadora = (typeof FONDOS_PRESENTADORA)[number];

/**
 * Instrucción de un guion guardado o entregado por el chat.
 * Un producto nulo representa un tema general. `fondo` es opcional: lo elige
 * el agente para el video de la presentadora; los guiones anteriores no lo traen.
 */
export const esquemaInstruccionGuion = z.strictObject({
	fondo: z.enum(FONDOS_PRESENTADORA).nullable().optional(),
	producto_id: z.string().min(1).max(80).nullable(),
	campana: z.string().trim().max(120).nullable(),
	objetivo: z.enum([
		"dar_a_conocer",
		"promocion",
		"lanzamiento",
		"recordacion",
	]),
	tono: z.string().trim().min(1).max(80),
	red: z.enum(["instagram", "tiktok", "facebook"]),
	duracion_s: z.union([z.literal(15), z.literal(30), z.literal(60)]),
});

/** Contrato de la ruta anterior, que sigue exigiendo un producto. */
export const esquemaInstruccionGuionProducto = esquemaInstruccionGuion.extend({
	producto_id: esquemaInstruccionGuion.shape.producto_id.unwrap(),
});

/** Instrucción del administrador ya validada. */
export type InstruccionGuion = z.infer<typeof esquemaInstruccionGuion>;

/**
 * Caracteres hablados que caben en un video: 20 por segundo, con margen sobre
 * los 15 de una voz en español (DT-01, 25.4). Lo usan el guion, que lo pide al
 * modelo, y el prompt de avatar, que lo valida.
 */
export function maximoCaracteresVoz(duracion: DuracionVideo): number {
	return duracion * 20;
}

/**
 * Caracteres de voz que se le piden al modelo: el 80 % del máximo. Los modelos
 * cuentan mal los caracteres (con 300 pedidos llegaron a devolver 355), así que
 * se pide con margen y la validación sigue usando `maximoCaracteresVoz`.
 */
export function objetivoCaracteresVoz(duracion: DuracionVideo): number {
	return Math.floor(maximoCaracteresVoz(duracion) * 0.8);
}

const texto = (maximo: number) => z.string().min(1).max(maximo);

const escena = z.strictObject({
	inicio_s: z.int().min(0).max(60),
	fin_s: z.int().min(1).max(60),
	que_se_ve: texto(300),
	// Una escena puede no llevar texto en pantalla o no tener voz.
	texto_pantalla: z.string().max(120),
	voz: z.string().max(400),
});

/**
 * Forma del guion, sin las reglas de tiempo. Es la que se envía al modelo como
 * esquema de salida estructurada; los tiempos se comprueban después con
 * `crearEsquemaGuion`, porque dependen de la duración pedida.
 */
export const formaGuion = z.strictObject({
	titulo: texto(80),
	gancho: texto(300),
	escenas: z.array(escena).min(1).max(12),
	llamado_accion: texto(200),
	texto_publicacion: texto(2200),
	musica_sugerida: texto(200),
	notas_produccion: texto(600),
});

/** Guion generado por el agente, ya validado. */
export type Guion = z.infer<typeof formaGuion>;

/**
 * Esquema completo del guion para una duración: la primera escena empieza en 0,
 * cada escena empieza donde termina la anterior, dura al menos un segundo y la
 * última termina en la duración pedida (DT-01, sección 25).
 */
export function crearEsquemaGuion(duracion: DuracionVideo) {
	return formaGuion.superRefine((guion, contexto) => {
		let esperado = 0;
		guion.escenas.forEach((e, i) => {
			if (e.inicio_s !== esperado) {
				contexto.addIssue({
					code: "custom",
					path: ["escenas", i, "inicio_s"],
					message: `La escena debe empezar en ${esperado} s`,
				});
			}
			if (e.fin_s <= e.inicio_s) {
				contexto.addIssue({
					code: "custom",
					path: ["escenas", i, "fin_s"],
					message: "La escena debe terminar después de empezar",
				});
			}
			esperado = e.fin_s;
		});
		if (esperado !== duracion) {
			contexto.addIssue({
				code: "custom",
				path: ["escenas"],
				message: `La última escena debe terminar en ${duracion} s`,
			});
		}
	});
}

/**
 * Esquema JSON de `formaGuion` para la salida estructurada de Gemini. Se quita
 * `$schema` porque la API solo admite un subconjunto de JSON Schema.
 */
export function esquemaJsonGuion(): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(z.toJSONSchema(formaGuion)).filter(
			([clave]) => clave !== "$schema",
		),
	);
}
