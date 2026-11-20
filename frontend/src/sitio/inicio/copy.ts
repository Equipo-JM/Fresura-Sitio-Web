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

/** Tamaños e inclusiones del menú provisional que acompañan a las categorías. */
export const DATOS_CATEGORIAS: Record<string, string> = {
	fresitas: "9 oz · Incluye 1 base, 1 espolvoreado, 1 salsa y 1 topping",
	fresotas: "13 oz · Incluye 1 base, 2 espolvoreados, 2 salsas y 2 toppings",
	fresuras:
		"16 oz · Incluye 1 base, 2 espolvoreados, 2 salsas, 2 toppings y helado",
	chocolate: "9, 12 y 16 oz",
	miti: "Fresitas, Fresotas y Fresuras",
	compartir: "Ensalada de frutas, Merengón y Fresubowl",
};

export { NOSOTROS } from "../../../../backend/supabase/functions/_shared/presentacion";

/** Ayudas de personalización que no son contenido administrable. */
export const PERSONALIZACION = {
	inicio: "Empieza por la base",
	base: "Las mermeladas como base están por confirmar con Fresura.",
	frases: ["Va tomando forma", "Se ve delicioso", "Tu Fresura ideal"],
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

/**
 * Frase bajo el logotipo de la portada cuando el contenido aún trae uno de los
 * lemas anteriores al rediseño. Un título nuevo editado en el panel la reemplaza.
 */
export const FRASE_PORTADA = "Un antojo fresco, hecho a tu manera";

/**
 * Fotos de ejemplo del inicio, tomadas del kit de marca (`referencia/`) solo
 * para el prototipo. El contrato de contenido aún no tiene campo para la foto
 * de portada ni para «Lo más reciente»: hasta que exista, se cambian aquí.
 */
export const FOTO_PORTADA = {
	src: "/ejemplos/portada-vaso.webp",
	alt: "Mano sosteniendo un vaso de fresas mientras cae chocolate encima",
	ancho: 800,
	alto: 1200,
} as const;

/**
 * Publicaciones de @fresuraco que muestran las polaroids de «Lo más reciente»,
 * por su código en Instagram (las tres últimas sin fijar, al 17 nov 2026).
 * No se actualizan solas: para cambiarlas se reemplaza el código.
 */
export const PUBLICACIONES_RECIENTE = [
	{ codigo: "Df3FurXt_4g", cinta: "flamingo" },
	{ codigo: "DfX1EGrsRji", cinta: "verde" },
	{ codigo: "Dekb08AsDhZ", cinta: "porcini" },
] as const;

/**
 * Reseñas de clientes tomadas de la ficha de Fresura en Google Maps. Propuesta del
 * equipo, por validar con Fresura (RF-12 pedía no copiar reseñas individuales).
 * Los nombres van abreviados y no se usan fotos de perfil; los emojis se dejan como en el original. Se dejaron fuera las
 * reseñas que mencionan «Nuestro Bogotá», porque no es una de las dos sedes del sitio.
 */
export const RESENAS_GOOGLE: { autor: string; texto: string }[] = [
	{
		autor: "Paola Q.",
		texto:
			"Es El Mejor Lugar De Todo Bogotaaaaaa! Amo Cada Cosa Que Venden Allí Y Es Súper Fácil Llegar. Los Amo 💗.",
	},
	{
		autor: "Estefania G.",
		texto:
			"La atención es increíble y los productos deliciosos, recomendado al 100%.",
	},
	{
		autor: "María Fernanda C.",
		texto: "Excelente atención y servicio, muy recomendado 😜 ✨ 💗",
	},
];
