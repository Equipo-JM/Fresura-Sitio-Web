import { z } from "zod";
import type { DuracionVideo, Guion } from "./guion.ts";

/** Entrada estricta de IF-10; el guion guardado es la única fuente de contenido. */
export const esquemaPeticionPromptVideo = z.strictObject({
	guion_id: z.uuid(),
	herramienta: z.enum(["avatar", "escenas"]),
});

/** Las dos clases de herramienta admitidas por RF-17. */
export type HerramientaVideo = z.infer<
	typeof esquemaPeticionPromptVideo
>["herramienta"];

const texto = z.string().trim().min(1);
const formaAvatar = z.strictObject({
	estilo_general: texto,
	escenas: z
		.array(
			z.strictObject({
				orden: z.int().min(1),
				texto_avatar: texto,
				indicaciones: texto,
			}),
		)
		.min(1),
});
const formaEscenas = z.strictObject({
	estilo_general: texto,
	escenas: z
		.array(z.strictObject({ orden: z.int().min(1), descripcion: texto }))
		.min(1),
});

/** Salida validada de cada herramienta, antes de armar el texto para copiar. */
export type SalidaPromptVideo =
	| z.infer<typeof formaAvatar>
	| z.infer<typeof formaEscenas>;

/** Comprueba cantidad y orden de escenas y el límite hablado total de 20 caracteres/s. */
export function crearEsquemaPromptVideo(
	herramienta: HerramientaVideo,
	guion: Guion,
	duracion: DuracionVideo,
) {
	const forma = herramienta === "avatar" ? formaAvatar : formaEscenas;
	return forma.superRefine((salida, contexto) => {
		if (
			salida.escenas.length !== guion.escenas.length ||
			salida.escenas.some((escena, i) => escena.orden !== i + 1)
		) {
			contexto.addIssue({
				code: "custom",
				path: ["escenas"],
				message:
					"Las escenas deben corresponder al guion y estar numeradas desde 1 en orden",
			});
		}
		if (herramienta === "avatar") {
			const caracteres = salida.escenas.reduce(
				(total, escena) =>
					total + ("texto_avatar" in escena ? escena.texto_avatar.length : 0),
				0,
			);
			if (caracteres > duracion * 20)
				contexto.addIssue({
					code: "custom",
					path: ["escenas"],
					message: "El texto hablado no cabe en la duración del video",
				});
		}
	});
}

/** Esquema estructurado de Gemini para la herramienta, sin las reglas cruzadas. */
export function esquemaJsonPromptVideo(
	herramienta: HerramientaVideo,
): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(
			z.toJSONSchema(herramienta === "avatar" ? formaAvatar : formaEscenas),
		).filter(([clave]) => clave !== "$schema"),
	);
}
