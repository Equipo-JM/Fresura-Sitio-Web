import { describe, expect, it } from "vitest";
import { CALCOMANIAS, calcomaniasDeProducto } from "../src/sitio/calcomanias";
import { piezasIncluidas } from "../src/sitio/piezasIncluidas";
import prueba from "./datos/contenido-prueba.json";

describe("calcomanías de la ficha", () => {
	it("da dos calcomanías distintas y existentes para cada producto", () => {
		for (const producto of prueba.productos) {
			const [a, b] = calcomaniasDeProducto(producto.id);
			expect(a).not.toBe(b);
			expect(CALCOMANIAS).toHaveProperty(a);
			expect(CALCOMANIAS).toHaveProperty(b);
		}
	});
	it("repite la misma pareja para el mismo producto", () => {
		expect(calcomaniasDeProducto("fresitas-caribena")).toEqual(
			calcomaniasDeProducto("fresitas-caribena"),
		);
	});
	it("surte varias parejas entre los productos del menú", () => {
		const parejas = new Set(
			prueba.productos.map((p) => calcomaniasDeProducto(p.id).join("+")),
		);
		expect(parejas.size).toBeGreaterThan(3);
	});
});

describe("piezas incluidas", () => {
	it("separa cantidades y nombres, también la última pieza tras «y»", () => {
		expect(
			piezasIncluidas(
				"Incluye 1 base, 2 espolvoreados, 2 salsas, 2 toppings y helado",
			),
		).toEqual([
			{ cantidad: 1, nombre: "base" },
			{ cantidad: 2, nombre: "espolvoreados" },
			{ cantidad: 2, nombre: "salsas" },
			{ cantidad: 2, nombre: "toppings" },
			{ cantidad: null, nombre: "helado" },
		]);
	});
	it("deja como texto lo que no empieza por «Incluye»", () => {
		expect(
			piezasIncluidas("Disponible en las sedes U Nacional y U Javeriana"),
		).toBeNull();
	});
	it("deja como texto un «Incluye» con una sola pieza", () => {
		expect(piezasIncluidas("Incluye helado")).toBeNull();
	});
});
