/**
 * Textos de presentación del inicio que el contrato no trae. Son propuesta del
 * equipo de diseño (rediseño de noviembre de 2026) y deben validarse con Fresura
 * antes de publicar. Si cambian, se cambian aquí, no en las páginas.
 */

/** Frase corta que acompaña el nombre de cada categoría, por su id. */
export const FRASES_CATEGORIAS: Record<string, string> = {
	fresitas: "Para un antojo chiquito",
	fresotas: "Cuando el antojo es generoso",
	fresuras: "Con helado, para darte el gusto completo",
	chocolate: "Fresas y chocolate, sin rodeos",
	miti: "Tres tamaños para elegir",
	compartir: "Para el plan con tu gente",
};

/** Opciones del selector «Hoy se me antoja…», cada una lleva a una categoría. */
export const ANTOJOS = [
	{ texto: "algo chiquito", detalle: "Fresitas · 9 oz", categoria: "fresitas" },
	{
		texto: "una porción generosa",
		detalle: "Fresotas · 13 oz",
		categoria: "fresotas",
	},
	{
		texto: "fresas con helado",
		detalle: "Fresuras · 16 oz",
		categoria: "fresuras",
	},
	{
		texto: "fresas con chocolate",
		detalle: "9, 12 o 16 oz",
		categoria: "chocolate",
	},
	{ texto: "un Miti Miti", detalle: "Tres tamaños", categoria: "miti" },
	{
		texto: "algo para compartir",
		detalle: "Ensalada, Merengón o Fresubowl",
		categoria: "compartir",
	},
] as const;

/** Textos de «Lo más reciente»: publicaciones de ejemplo, sin fotos reales todavía. */
export const TEXTO_RECIENTE =
	"Fotos y videos de tus fresas favoritas. Síguenos para enterarte primero.";
