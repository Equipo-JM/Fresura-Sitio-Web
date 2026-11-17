import { describe, expect, it } from "vitest";
import {
	type Contenido,
	esquemaContenido,
} from "../../supabase/functions/_shared/esquemas/contenido";
import {
	entregarGuion,
	listarProductos,
	verNegocio,
	verProducto,
	verPromociones,
	verSedes,
} from "../../supabase/functions/ia/agente/herramientas";
import ejemplo from "../datos/contenido-1.0.1.ejemplo.json";
import { guionDePrueba } from "../datos/guion";

const HOY = "2026-11-12";

/** Ejemplo del contrato con un segundo producto que se llama igual en otra categoría. */
function contenidoDePrueba(): Contenido {
	const base = esquemaContenido.parse(structuredClone(ejemplo));
	const [fresota] = base.productos;
	return {
		...base,
		productos: [
			fresota,
			{
				...fresota,
				id: "fresitas-arma-tu-fresita",
				categoria: "fresitas",
				nombre: "Arma tu Fresota",
				presentaciones: [
					{ id: "9-oz", nombre: "9 oz", descripcion: null, precio: 14900 },
				],
			},
			{ ...fresota, id: "fuera-de-carta", vigente: false },
		],
	};
}

const instruccion = {
	producto_id: "arma-tu-fresota",
	campana: null,
	objetivo: "dar_a_conocer" as const,
	tono: "Cercano y divertido",
	red: "tiktok" as const,
	duracion_s: 15 as const,
};

describe("herramientas de solo lectura del agente (DT-01, 25.6)", () => {
	it("listar_productos devuelve los vigentes con categoría y tamaños, para distinguir nombres repetidos", () => {
		const lista = listarProductos(contenidoDePrueba());
		expect(lista.map((p) => p.id)).toEqual([
			"arma-tu-fresota",
			"fresitas-arma-tu-fresita",
		]);
		expect(lista[1]).toEqual({
			id: "fresitas-arma-tu-fresita",
			nombre: "Arma tu Fresota",
			categoria: "Fresitas",
			tamanos: [{ nombre: "9 oz", precio: 14900 }],
		});
	});

	it("listar_productos filtra por categoría, por id o por nombre", () => {
		const contenido = contenidoDePrueba();
		expect(listarProductos(contenido, "fresitas").map((p) => p.id)).toEqual([
			"fresitas-arma-tu-fresita",
		]);
		expect(listarProductos(contenido, "Fresotas").map((p) => p.id)).toEqual([
			"arma-tu-fresota",
		]);
	});

	it("listar_productos omite los precios nulos", () => {
		const contenido = contenidoDePrueba();
		contenido.productos[0].presentaciones[0].precio = null;
		expect(listarProductos(contenido)[0].tamanos).toEqual([
			{ nombre: "13 oz" },
		]);
	});

	it("ver_producto reutiliza los datos del producto y avisa si no existe", () => {
		const contenido = contenidoDePrueba();
		expect(verProducto(contenido, "arma-tu-fresota", HOY)).toMatchObject({
			nombre: "Arma tu Fresota",
			presentaciones: [{ nombre: "13 oz", precio: 20900 }],
		});
		expect(verProducto(contenido, "fuera-de-carta", HOY)).toEqual({
			error: "Ese producto no existe o no está vigente. Usa listar_productos.",
		});
	});

	it("ver_promociones devuelve solo las vigentes en la fecha, con el nombre de los productos", () => {
		const contenido = contenidoDePrueba();
		expect(verPromociones(contenido, HOY)).toEqual([
			{
				titulo: "Martes de fresas: 2 × 1 en Fresotas",
				desde: "2026-11-03",
				hasta: "2026-11-24",
				condiciones:
					"En la sede U Nacional, no acumulable con otras promociones.",
				productos: [{ id: "arma-tu-fresota", nombre: "Arma tu Fresota" }],
			},
		]);
		expect(verPromociones(contenido, "2026-12-01")).toEqual([]);
	});

	it("ver_promociones omite las promociones cuyos productos no están vigentes", () => {
		const contenido = contenidoDePrueba();
		contenido.productos[0].vigente = false;
		expect(verPromociones(contenido, HOY)).toEqual([]);
	});

	it("PU-18: ver_sedes no entrega coordenadas ni WhatsApp", () => {
		const contenido = contenidoDePrueba();
		contenido.negocio.sedes[0].whatsapp = "573001234567";
		const sedes = verSedes(contenido);
		expect(sedes[0]).toEqual({
			nombre: "Sede U Nacional",
			direccion: "Calle 45 # 28-10",
			horarios: contenido.negocio.sedes[0].horarios,
			atiende_pedidos: true,
		});
		const texto = JSON.stringify(sedes);
		expect(texto).not.toContain("573001234567");
		expect(texto).not.toContain("lat");
	});

	it("ver_negocio devuelve la presentación publicada", () => {
		const contenido = contenidoDePrueba();
		expect(verNegocio(contenido)).toEqual(contenido.negocio.presentacion);
	});
});

describe("entregar_guion", () => {
	const contenido = contenidoDePrueba();

	it("exige haber consultado la ficha del producto (NT-12)", () => {
		const resultado = entregarGuion(
			{ instruccion, guion: guionDePrueba() },
			{ contenido, productosConsultados: new Set() },
		);
		expect(resultado).toEqual({
			ok: false,
			errores: [
				"Antes de entregar, consulta el producto arma-tu-fresota con ver_producto.",
			],
		});
	});

	it("acepta un guion válido del producto consultado", () => {
		const guion = guionDePrueba();
		expect(
			entregarGuion(
				{ instruccion, guion },
				{ contenido, productosConsultados: new Set(["arma-tu-fresota"]) },
			),
		).toEqual({ ok: true, instruccion, guion });
	});

	it("rechaza en el guion el precio de otro producto", () => {
		const guion = guionDePrueba();
		guion.texto_publicacion = "Arma tu Fresota desde $14.900";
		const resultado = entregarGuion(
			{ instruccion, guion },
			{ contenido, productosConsultados: new Set(["arma-tu-fresota"]) },
		);
		expect(resultado).toEqual({
			ok: false,
			errores: [
				"El precio $14.900 no está publicado; usa solo los precios de las herramientas.",
			],
		});
	});

	it("devuelve todos los errores juntos para que el agente los corrija", () => {
		const guion = guionDePrueba();
		guion.escenas[2].fin_s = 14;
		guion.escenas[0].voz = "a".repeat(300);
		guion.texto_publicacion = "Hoy a solo $9.900 🍓";
		const resultado = entregarGuion(
			{ instruccion, guion },
			{ contenido, productosConsultados: new Set(["arma-tu-fresota"]) },
		);
		expect(resultado.ok).toBe(false);
		const errores = resultado.ok ? [] : resultado.errores;
		expect(errores.join("\n")).toMatch(/terminar en 15 s/);
		expect(errores.join("\n")).toMatch(
			/La voz suma \d+ caracteres y el máximo es 300/,
		);
		expect(errores.join("\n")).toMatch(/9\.900.*no está publicado/);
	});
});
