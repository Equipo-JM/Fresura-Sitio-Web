/** Calcomanías de la marca en `/public/calcomanias`, con su ancho y alto originales. */
const ILUSTRACIONES = {
	"fresitas-fresotas-fresuras": [480, 364],
	"dulce-pero-con-estilo-gafas": [480, 416],
	"las-mejores-fresas-de-bogota": [466, 480],
	"ven-date-un-gusto-bonito": [384, 480],
	"fresas-con-crema-chocolate-y-flow": [446, 480],
} as const;

const STICKERS_KIT = {
	"sticker-sello": [436, 436],
	"sticker-simbolo": [404, 354],
	"sticker-horizontal": [811, 182],
} as const;

/** Dimensiones de las ilustraciones y los stickers vectoriales del kit. */
export const CALCOMANIAS = { ...ILUSTRACIONES, ...STICKERS_KIT };

/** Resuelve el recurso público según el formato original de la marca. */
export function rutaCalcomania(nombre: NombreCalcomania) {
	return nombre in STICKERS_KIT
		? `/marca/${nombre}.svg`
		: `/calcomanias/${nombre}.webp`;
}
/** Nombre de archivo, sin extensión, de una calcomanía disponible. */
export type NombreCalcomania = keyof typeof CALCOMANIAS;

const STICKERS = Object.keys(STICKERS_KIT) as NombreCalcomania[];
const NOMBRES = Object.keys(ILUSTRACIONES) as NombreCalcomania[];

/**
 * Dos calcomanías distintas para la ficha de un producto. Salen del id, así que
 * un producto muestra siempre la misma pareja y cada producto cambia de pareja
 * sin guardar nada en el contenido.
 */
export function calcomaniasDeProducto(
	idProducto: string,
): [NombreCalcomania, NombreCalcomania] {
	let semilla = 0;
	for (const letra of idProducto) {
		// Hash de cadena clásico (×31); `>>> 0` lo mantiene entero y positivo.
		semilla = (semilla * 31 + letra.charCodeAt(0)) >>> 0;
	}
	const total = NOMBRES.length;
	const primera = semilla % total;
	return [
		NOMBRES[primera],
		STICKERS[Math.floor(semilla / total) % STICKERS.length],
	];
}
