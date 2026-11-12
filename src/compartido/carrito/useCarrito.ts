import { useSyncExternalStore } from "react";
import {
	agregarLinea,
	cambiarCantidad,
	leerCarrito,
	quitarLinea,
	suscribirCarrito,
} from "./almacenCarrito";

/**
 * Carrito de la pestaña, suscrito al almacén. Las pantallas lo usan para leer
 * las líneas y para cambiarlas; la lógica de precios y límites vive en `reglas.ts`.
 */
export function useCarrito() {
	const lineas = useSyncExternalStore(suscribirCarrito, leerCarrito);
	return {
		lineas,
		agregar: agregarLinea,
		cambiarCantidad,
		quitar: quitarLinea,
	};
}
