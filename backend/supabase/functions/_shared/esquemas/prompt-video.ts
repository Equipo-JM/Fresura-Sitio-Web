import { z } from "zod";
import {
	type DuracionVideo,
	type Guion,
	maximoCaracteresVoz,
} from "./guion.ts";

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

/** Valida los campos de un prompt guardado, incluidos los guardados con el texto corto. */
export function leerSalidaPromptVideo(
	herramienta: HerramientaVideo,
	valor: unknown,
) {
	return (herramienta === "avatar" ? formaAvatar : formaEscenas).safeParse(
		valor,
	);
}

/**
 * Identidad de la presentadora: una persona real que dio su permiso. En
 * Dreamina está guardada como el personaje `@fresura`, que mantiene su cara en
 * todos los videos.
 */
export const PERFIL_AVATAR_FRESURA = `Presentadora Fresura
Es una persona real del equipo de Fresura. Voz cálida y clara, en español de Colombia, con tuteo y velocidad normal.
En Dreamina es el personaje @fresura, guardado en la cuenta de Dreamina: escríbelo siempre en el prompt para que aparezca la misma persona. Las indicaciones solo ajustan gesto, emoción, encuadre y lugar; no cambian su apariencia.`;

/** Reúne en un solo bloque el estilo y todo el contenido de cada escena. */
export function textoCompletoPromptVideo(
	salida: SalidaPromptVideo,
	duracion: DuracionVideo,
) {
	return [
		`Video vertical 9:16 de ${duracion} segundos`,
		...(salida.escenas.some((escena) => "texto_avatar" in escena)
			? [PERFIL_AVATAR_FRESURA]
			: []),
		`Estilo general
${salida.estilo_general}`,
		...salida.escenas.map((escena) =>
			"texto_avatar" in escena
				? `Escena ${escena.orden}
Texto del avatar: ${escena.texto_avatar}
Indicaciones: ${escena.indicaciones}`
				: `Escena ${escena.orden}
${escena.descripcion}`,
		),
	].join("\n\n");
}

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
			if (caracteres > maximoCaracteresVoz(duracion))
				contexto.addIssue({
					code: "custom",
					path: ["escenas"],
					message: `El texto hablado suma ${caracteres} caracteres y el máximo es ${maximoCaracteresVoz(duracion)}`,
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
