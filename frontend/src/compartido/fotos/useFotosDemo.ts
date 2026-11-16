import { useSyncExternalStore } from "react";
import {
	type FotoDemo,
	leerFotosDemo,
	suscribirFotosDemo,
} from "./almacenFotosDemo";

const SIN_FOTOS: Record<string, FotoDemo> = {};

/**
 * Fotos que se cambiaron en el panel de demostración, por clave. En el
 * servidor (o sin IndexedDB) no hay ninguna.
 */
export function useFotosDemo(): Record<string, FotoDemo> {
	return useSyncExternalStore(
		suscribirFotosDemo,
		leerFotosDemo,
		() => SIN_FOTOS,
	);
}
