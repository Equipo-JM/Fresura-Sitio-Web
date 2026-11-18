import { describe, expect, it } from "vitest";
import { radioEnPixeles, urlMapaInsertado } from "../src/sitio/mapa";

describe("mapa de las sedes", () => {
	it("arma la inserción de Google Maps con coordenadas y zoom", () => {
		expect(urlMapaInsertado({ lat: 4.6347, lng: -74.0785 }, 16)).toBe(
			"https://www.google.com/maps?q=4.6347,-74.0785&z=16&hl=es&output=embed",
		);
	});

	it("convierte 5 km a píxeles según la escala de Web Mercator", () => {
		// En Bogotá (4,63°) con zoom 12 cada píxel mide unos 38 m: 5 km ≈ 131 px.
		expect(radioEnPixeles(5, 4.6347, 12)).toBeCloseTo(131.3, 0);
		// Cada nivel de zoom duplica la escala.
		expect(radioEnPixeles(5, 4.6347, 13)).toBeCloseTo(
			radioEnPixeles(5, 4.6347, 12) * 2,
			6,
		);
	});
});
