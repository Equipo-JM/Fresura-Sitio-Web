/** Una pieza de lo que trae un producto: «2 salsas» → { cantidad: 2, nombre: "salsas" }. */
export type PiezaIncluida = { cantidad: number | null; nombre: string };

/**
 * Separa una característica del tipo «Incluye 1 base, 2 salsas y helado» en sus
 * piezas, para mostrarlas como estampas. Devuelve `null` si el texto no empieza
 * por «Incluye» o no tiene al menos dos piezas: esa característica se muestra
 * entonces como texto normal.
 */
export function piezasIncluidas(texto: string): PiezaIncluida[] | null {
	const resto = texto.trim().match(/^incluye\s+(.+)$/i)?.[1];
	if (!resto) return null;
	const partes = resto
		.split(/\s*,\s*|\s+y\s+/)
		.map((parte) => parte.trim())
		.filter(Boolean);
	if (partes.length < 2) return null;
	return partes.map((parte) => {
		const conCantidad = parte.match(/^(\d+)\s+(.+)$/);
		return conCantidad
			? { cantidad: Number(conCantidad[1]), nombre: conCantidad[2] }
			: { cantidad: null, nombre: parte };
	});
}
