import type { LineaCarrito } from "./reglas";

/** Unidades totales del carrito, para el contador del encabezado. */
export function unidadesCarrito(lineas: LineaCarrito[]): number {
	return lineas.reduce((total, linea) => total + linea.cantidad, 0);
}
