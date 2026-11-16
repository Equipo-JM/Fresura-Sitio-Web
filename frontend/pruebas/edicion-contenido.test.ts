import { describe, expect, it } from "vitest";
import { esquemaContenido } from "../../backend/supabase/functions/_shared/esquemas/contenido";
import {
	completarIdentificadores,
	erroresContenido,
} from "../src/panel/contenido/edicionContenido";
import ejemplo from "./datos/contenido-prueba.json";

function base() {
	return esquemaContenido.parse(ejemplo);
}

describe("edición sin alterar el contrato", () => {
	it("deriva nombres internos de nombres con tildes, evita colisiones y conserva las referencias existentes", () => {
		const contenido = base();
		contenido.categorias.push(
			{ id: "", nombre: "Fresitas", orden: 8 },
			{ id: "", nombre: "Fresitas", orden: 9 },
		);
		contenido.productos[0].presentaciones.push({
			id: "",
			nombre: "Porción pequeña",
			precio: null,
			descripcion: null,
		});
		const resultado = completarIdentificadores(contenido);
		expect(resultado.categorias.slice(-2).map((c) => c.id)).toEqual([
			"fresitas-2",
			"fresitas-3",
		]);
		expect(resultado.productos[0].presentaciones.at(-1)?.id).toBe(
			"porcion-pequena",
		);
		expect(resultado.productos[0].categoria).toBe("fresitas");
		expect(contenido.categorias.at(-1)?.id).toBe("");
	});
	it.each([
		[
			"negocio.sedes",
			(c: ReturnType<typeof base>) => {
				c.negocio.sedes[1].atiende_pedidos = true;
			},
		],
		[
			"productos.0.nombre",
			(c: ReturnType<typeof base>) => {
				c.productos.push({ ...c.productos[0] });
			},
		],
		[
			"promociones.0.productos.0",
			(c: ReturnType<typeof base>) => {
				c.promociones[0].productos = ["no-existe"];
			},
		],
		[
			"promociones.0.vigencia.hasta",
			(c: ReturnType<typeof base>) => {
				c.promociones[0].vigencia.hasta = "2026-01-01";
			},
		],
		[
			"productos.0.grupos_opciones.0.maximo",
			(c: ReturnType<typeof base>) => {
				c.productos[0].grupos_opciones[0].maximo = 2;
			},
		],
		[
			"productos.0.grupos_opciones.0.maximo",
			(c: ReturnType<typeof base>) => {
				c.productos[0].grupos_opciones[0].maximo = 999;
			},
		],
		[
			"productos.0.categoria",
			(c: ReturnType<typeof base>) => {
				c.productos[0].categoria = "no-existe";
			},
		],
		[
			"promociones.0.vigencia.desde",
			(c: ReturnType<typeof base>) => {
				c.promociones[0].vigencia.desde = "2026-02-30";
			},
		],
	] as const)(
		"señala un campo corregible al rechazar una regla cruzada: %s",
		(ruta, cambiar) => {
			const contenido = base();
			cambiar(contenido);
			const errores = erroresContenido(contenido);
			const campo =
				ruta === "productos.0.nombre" ? "productos.24.nombre" : ruta;
			expect(errores[campo]).toBeTruthy();
			expect(Object.values(errores).join(" ")).not.toMatch(
				/RC-|RF-|id repetido|JSON/,
			);
		},
	);
});
