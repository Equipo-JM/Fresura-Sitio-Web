import { describe, expect, it } from "vitest";
import { esquemaContenido } from "../../supabase/functions/_shared/esquemas/contenido";
import {
	extraerPrecios,
	preciosPublicados,
	validarGuionContraDatos,
	validarTextoContraDatos,
} from "../../supabase/functions/ia/agente/validadores";
import ejemplo from "../datos/contenido-1.0.1.ejemplo.json";
import { guionDePrueba } from "../datos/guion";

const contenido = () => esquemaContenido.parse(structuredClone(ejemplo));

describe("extraerPrecios", () => {
	it.each([
		["Cuesta $14.900", [14900]],
		["Desde $ 20,900 hasta $9900", [20900, 9900]],
		["Llévala por 15.000 pesos", [15000]],
		["Solo 20 mil pesos", [20000]],
		["Por 12 mil", [12000]],
	])("%s → %j", (texto, precios) => {
		expect(extraerPrecios(texto)).toEqual(precios);
	});

	it.each([
		"Vaso de 13 oz",
		"2 × 1 en Fresotas",
		"Video de 15 segundos",
		"Abierto de 12:00 a 8:00",
		"Calle 45 # 28-10",
	])("no confunde con precios: %s", (texto) => {
		expect(extraerPrecios(texto)).toEqual([]);
	});
});

describe("validadores contra lo publicado (DT-01, 25.6)", () => {
	it("los precios publicados incluyen presentaciones y adicionales, sin los nulos", () => {
		const datos = contenido();
		const precios = preciosPublicados(datos);
		expect(precios.has(20900)).toBe(true);
		expect(precios.has(0)).toBe(false);
	});

	it("el texto del chat no puede nombrar precios que no están publicados", () => {
		const precios = preciosPublicados(contenido());
		expect(
			validarTextoContraDatos("La Fresota de 13 oz cuesta $20.900", precios),
		).toEqual([]);
		expect(validarTextoContraDatos("Hoy a $15.000", precios)).toEqual([
			"El precio $15.000 no está publicado; usa solo los precios de las herramientas.",
		]);
	});

	it("el guion debe nombrar el producto y no inventar precios", () => {
		const precios = preciosPublicados(contenido());
		const guion = guionDePrueba();
		expect(validarGuionContraDatos(guion, "Arma tu Fresota", precios)).toEqual(
			[],
		);

		guion.titulo = "Un antojo";
		guion.llamado_accion = "Escríbenos";
		guion.texto_publicacion = "Ven por la tuya";
		guion.gancho = "Mira esto";
		expect(validarGuionContraDatos(guion, "Arma tu Fresota", precios)).toEqual([
			"El guion no nombra el producto «Arma tu Fresota».",
		]);
	});

	it("reconoce el producto sin importar mayúsculas ni tildes", () => {
		const guion = guionDePrueba();
		guion.texto_publicacion = "La ACIDA que te encanta";
		expect(
			validarGuionContraDatos(guion, "Ácida", preciosPublicados(contenido())),
		).toEqual([]);
	});
});
