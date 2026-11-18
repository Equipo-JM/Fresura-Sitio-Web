/** Punto geográfico en grados decimales, como `sede.ubicacion` en el contenido. */
export type Coordenadas = { lat: number; lng: number };

// Metros por píxel en el ecuador con zoom 0 en la proyección Web Mercator de los
// mosaicos de 256 px que usan Google Maps y OpenStreetMap.
const METROS_POR_PIXEL_ECUADOR = 156543.03392;

/**
 * Dirección de la inserción de Google Maps centrada en unas coordenadas. No
 * necesita clave ni cuenta; el mapa se carga en un iframe (CSP: frame-src).
 * Sin `conMarcador`, el mapa solo se centra (`ll`) y no pinta el pin de Google,
 * para poner encima el marcador propio de la marca.
 */
export function urlMapaInsertado(
	{ lat, lng }: Coordenadas,
	zoom: number,
	conMarcador = true,
): string {
	const centro = conMarcador ? `q=${lat},${lng}` : `ll=${lat},${lng}`;
	return `https://www.google.com/maps?${centro}&z=${zoom}&hl=es&output=embed`;
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

/** Posición de una coordenada sobre el mosaico mundial Web Mercator. */
export function proyectar({ lat, lng }: Coordenadas, zoom: number) {
	const lado = 256 * 2 ** zoom;
	const radianes = (lat * Math.PI) / 180;
	return {
		x: ((lng + 180) / 360) * lado,
		y: ((1 - Math.asinh(Math.tan(radianes)) / Math.PI) / 2) * lado,
	};
}

/** Centro visible después de arrastrar el mapa en píxeles CSS. */
export function centroTrasArrastre(
	centro: Coordenadas,
	zoom: number,
	dx: number,
	dy: number,
): Coordenadas {
	const punto = proyectar(centro, zoom);
	const lado = 256 * 2 ** zoom;
	const y = Math.max(0, Math.min(1, (punto.y - dy) / lado));
	return {
		lat: (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI,
		lng: ((((((punto.x - dx) / lado) * 360) % 360) + 360) % 360) - 180,
	};
}
