import type { Contenido } from "../../../supabase/functions/_shared/esquemas/contenido";

/** Dominio reservado para las imágenes de ejemplo del contenido de respaldo. */
const DOMINIO_EJEMPLO = ".invalid";

/**
 * Si el producto tiene una foto real. Las rutas del dominio de ejemplo no se
 * muestran: en su lugar va el espacio «Foto por validar» (DD-43).
 */
export function tieneFoto(
	imagen: Contenido["productos"][number]["imagen"],
): boolean {
	try {
		return !new URL(imagen.ruta).hostname.endsWith(DOMINIO_EJEMPLO);
	} catch {
		return false;
	}
}
