/** Punto geográfico en grados decimales, como `sede.ubicacion` en el contenido. */
export type Coordenadas = { lat: number; lng: number };

// Metros por píxel en el ecuador con zoom 0 en la proyección Web Mercator de los
// mosaicos de 256 px que usan Google Maps y OpenStreetMap.
const METROS_POR_PIXEL_ECUADOR = 156543.03392;

/**
 * Dirección de la inserción de Google Maps centrada en unas coordenadas. No
 * necesita clave ni cuenta; el mapa se carga en un iframe (CSP: frame-src).
 */
export function urlMapaInsertado(
	{ lat, lng }: Coordenadas,
	zoom: number,
): string {
	return `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&hl=es&output=embed`;
}

/**
 * Radio en píxeles CSS que ocupa una distancia sobre el mapa con ese zoom y esa
 * latitud. Sirve para dibujar la zona de domicilios encima de la inserción, que
 * no permite trazar círculos; es una aproximación visual, no un límite exacto.
 */
export function radioEnPixeles(
	kilometros: number,
	latitud: number,
	zoom: number,
): number {
	const metrosPorPixel =
		(METROS_POR_PIXEL_ECUADOR * Math.cos((latitud * Math.PI) / 180)) /
		2 ** zoom;
	return (kilometros * 1000) / metrosPorPixel;
}
