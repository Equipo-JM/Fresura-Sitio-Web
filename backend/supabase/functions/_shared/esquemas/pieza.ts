import { z } from "zod";

/**
 * Piezas de contenido que el agente entrega en el chat además del guion:
 * textos para redes y prompts listos para pegar en cada herramienta externa.
 * El panel y la función comparten estas reglas (DD-33).
 */

/** Tipos de pieza; cada uno tiene su propio formato y, si aplica, su herramienta. */
export const TIPOS_PIEZA = [
	"publicacion",
	"carrusel",
	"prompt_imagen",
	"prompt_clip",
	"prompt_heygen",
	"variantes_gancho",
	"ideas",
	"calendario",
	"revision",
] as const;

/** Tipo de pieza. */
export type TipoPieza = (typeof TIPOS_PIEZA)[number];

/** Herramienta externa donde se pega la pieza; las demás se copian sin abrir nada. */
export const HERRAMIENTA_PIEZA: Partial<
	Record<TipoPieza, { nombre: string; url: string }>
> = {
	carrusel: { nombre: "Canva", url: "https://www.canva.com/" },
	prompt_imagen: { nombre: "Gemini", url: "https://gemini.google.com/app" },
	prompt_clip: { nombre: "Google Vids", url: "https://vids.google.com/" },
	prompt_heygen: { nombre: "HeyGen", url: "https://app.heygen.com/" },
};

/** Nombre visible de cada tipo, para el panel y la biblioteca. */
export const NOMBRE_PIEZA: Record<TipoPieza, string> = {
	publicacion: "Publicación",
	carrusel: "Carrusel",
	prompt_imagen: "Prompt de foto",
	prompt_clip: "Prompts de clip",
	prompt_heygen: "Prompt de HeyGen",
	variantes_gancho: "Variantes de gancho",
	ideas: "Ideas de contenido",
	calendario: "Calendario de publicaciones",
	revision: "Revisión antes de publicar",
};

/** Bloques permitidos por tipo: [mínimo, máximo]. Un carrusel de Instagram admite 10 imágenes. */
export const BLOQUES_PIEZA: Record<TipoPieza, readonly [number, number]> = {
	publicacion: [1, 3],
	carrusel: [5, 14],
	prompt_imagen: [1, 4],
	prompt_clip: [1, 8],
	prompt_heygen: [1, 2],
	variantes_gancho: [2, 3],
	ideas: [3, 8],
	calendario: [3, 31],
	revision: [3, 12],
};

const bloque = z.strictObject({
	etiqueta: z.string().trim().min(1).max(60),
	texto: z.string().trim().min(1).max(2200),
});

/**
 * Forma que el agente envía con `entregar_pieza`. Los límites por tipo se
 * comprueban aparte, con `erroresPieza`, para devolverle mensajes claros.
 */
export const esquemaPieza = z.strictObject({
	tipo: z.enum(TIPOS_PIEZA),
	titulo: z.string().trim().min(1).max(80),
	red: z.enum(["instagram", "tiktok", "facebook"]).nullable(),
	bloques: z.array(bloque).min(1).max(31),
});

/** Pieza validada. */
export type Pieza = z.infer<typeof esquemaPieza>;

/** Reglas por tipo que el esquema no expresa. Devuelve una lista vacía si cumple. */
export function erroresPieza(pieza: Pieza): string[] {
	const errores: string[] = [];
	const [minimo, maximo] = BLOQUES_PIEZA[pieza.tipo];
	if (pieza.bloques.length < minimo || pieza.bloques.length > maximo)
		errores.push(
			`Un ${NOMBRE_PIEZA[pieza.tipo].toLowerCase()} lleva entre ${minimo} y ${maximo} bloques; enviaste ${pieza.bloques.length}.`,
		);
	if (pieza.tipo === "carrusel") {
		const laminas = pieza.bloques.filter((b) =>
			/^l[aá]mina/i.test(b.etiqueta),
		).length;
		if (laminas < 3 || laminas > 10)
			errores.push(
				`El carrusel lleva de 3 a 10 bloques con etiqueta «Lámina N»; tiene ${laminas}.`,
			);
		if (!pieza.bloques.some((b) => /^prompt para canva/i.test(b.etiqueta)))
			errores.push(
				"Agrega el bloque «Prompt para Canva IA» con el carrusel completo.",
			);
	}
	if (
		(pieza.tipo === "publicacion" || pieza.tipo === "carrusel") &&
		pieza.red === null
	)
		errores.push("Indica la red de la publicación.");
	return errores;
}

/** Texto completo para copiar: cada bloque con su etiqueta. */
export function textoPieza(pieza: Pieza): string {
	return [
		pieza.titulo,
		...pieza.bloques.map((b) => `${b.etiqueta}\n${b.texto}`),
	].join("\n\n");
}

/**
 * Lo que se pega en la herramienta externa. Si hay un bloque «Prompt para …»
 * (el del carrusel para Canva IA), se copia solo ese, porque ya trae todo; si
 * no, los bloques de prompt sin la explicación «Cómo usar».
 */
export function promptPieza(pieza: Pieza): string {
	const directo = pieza.bloques.find((b) => /^prompt para/i.test(b.etiqueta));
	if (directo) return directo.texto;
	const prompts = pieza.bloques.filter(
		(b) => !/^c[oó]mo usar/i.test(b.etiqueta),
	);
	return prompts
		.map((b) => (prompts.length > 1 ? `${b.etiqueta}\n${b.texto}` : b.texto))
		.join("\n\n");
}
