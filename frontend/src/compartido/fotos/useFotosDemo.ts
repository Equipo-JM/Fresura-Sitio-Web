import { useContext, useSyncExternalStore } from "react";
import { FuenteContenido } from "../contenido/FuenteContenido";
import {
	type FotoDemo,
	leerFotosDemo,
	suscribirFotosDemo,
} from "./almacenFotosDemo";

const SIN_FOTOS: Record<string, FotoDemo> = {};

/**
 * Fotos que se cambiaron en el panel de demostración, por clave. En el
 * servidor (o sin IndexedDB) no hay ninguna. La vista previa real usa solo las
 * fotos del borrador, aunque queden cambios locales de una demostración.
 */
export function useFotosDemo(): Record<string, FotoDemo> {
	const fuente = useContext(FuenteContenido);
	const fotos = useSyncExternalStore(
		suscribirFotosDemo,
		leerFotosDemo,
		() => SIN_FOTOS,
	);
	return fuente ? SIN_FOTOS : fotos;
}
