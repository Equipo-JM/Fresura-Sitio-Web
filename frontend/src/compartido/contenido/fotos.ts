import type { Contenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";

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

// Fotos provisionales en `frontend/public/ejemplos/productos/`, tomadas de la tienda
// de Fresura en Rappi y, en alta resolución, de su catálogo de WhatsApp.
// A las que traían texto (nombre, datos o íconos) se les borró en el archivo
// para que solo se vea el producto. La Dosis no está en el menú.
const FOTOS_RAPPI: Record<string, string> = {
	"fresitas-arma-tu-fresita": "arma-tu-fresita-9oz",
	"fresitas-caribena": "fresita-caribena",
	"fresitas-oscura": "fresita-oscura",
	"fresitas-chocolatosa": "fresita-chocolatosa",
	"fresitas-frutos-secos": "fresita-frutos-secos",
	"fresotas-arma-tu-fresota": "arma-tu-fresota-13oz",
	"fresotas-chocolatosa": "fresota-chocolatosa",
	"fresotas-acida": "fresota-acida",
	"fresotas-sorpresa": "fresota-sorpresa",
	"fresotas-explosiva": "fresota-explosiva",
	"fresuras-arma-tu-fresura": "arma-tu-fresura-16oz",
	"fresuras-acida": "fresura-acida",
	"fresuras-top": "fresura-top",
	"fresuras-dulce": "fresura-dulce",
	"fresuras-fit": "fresura-fit",
	"chocolate-fresitas": "fresitas-con-chocolate",
	"chocolate-fresotas": "fresotas-con-chocolate",
	"chocolate-fresuras": "fresuras-con-chocolate",
	"miti-fresitas": "fresitas-miti-miti",
	"miti-fresotas": "fresotas-miti-miti",
	"miti-fresuras": "fresuras-miti-miti",
	"compartir-ensalada-de-frutas": "ensalada-de-frutas",
	"compartir-merengon": "meregon",
	"compartir-fresubowl": "fresubowl",
};

/**
 * Ruta de la foto provisional de Rappi para el producto, si la hay. Se usa
 * solo cuando no hay foto publicada y va marcada «Por validar»: falta que
 * Fresura confirme que el sitio puede usarlas.
 */
export function fotoRappi(idProducto: string): string | undefined {
	const archivo = FOTOS_RAPPI[idProducto];
	return archivo && `/ejemplos/productos/${archivo}.webp`;
}
