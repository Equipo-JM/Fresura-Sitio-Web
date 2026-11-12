import { afterEach, describe, expect, it, vi } from "vitest";
import {
	leerContenidoPrincipal,
	obtenerContenido,
} from "../src/compartido/contenido/obtenerContenido";
import ejemplo from "./datos/contenido-1.0.1.ejemplo.json";

const fallar = () => Promise.reject(new Error("sin red"));
const devolver = (valor: unknown) => () =>
	Promise.resolve(structuredClone(valor));

describe("obtenerContenido", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("usa la fuente principal si cumple el contrato", async () => {
		const resultado = await obtenerContenido(devolver(ejemplo), fallar);
		expect(resultado.origen).toBe("principal");
		expect(resultado.contenido.promociones).toHaveLength(1);
	});

	it("usa el respaldo si la fuente principal falla", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const resultado = await obtenerContenido(fallar, devolver(ejemplo));
		expect(resultado.origen).toBe("respaldo");
	});

	it("usa el respaldo si la fuente principal no cumple el contrato", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const invalido = { ...ejemplo, estado: "otro" };
		const resultado = await obtenerContenido(
			devolver(invalido),
			devolver(ejemplo),
		);
		expect(resultado.origen).toBe("respaldo");
	});

	it("en respaldo nunca muestra precios ni promociones (DD-14)", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const { contenido } = await obtenerContenido(fallar, devolver(ejemplo));
		expect(contenido.promociones).toEqual([]);
		const precios = contenido.productos.flatMap((p) =>
			p.presentaciones.map((x) => x.precio),
		);
		expect(precios.every((precio) => precio === null)).toBe(true);
	});

	it("lanza un error si también falla el respaldo", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		await expect(obtenerContenido(fallar, fallar)).rejects.toThrow();
	});
});

describe("leerContenidoPrincipal", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("pide solo la columna json de la versión publicada", async () => {
		const espia = vi
			.spyOn(globalThis, "fetch")
			.mockImplementation(async () =>
				Response.json({ json: structuredClone(ejemplo) }),
			);
		await expect(leerContenidoPrincipal()).resolves.toEqual(ejemplo);
		const [entrada] = espia.mock.calls[0];
		const url = new URL(
			entrada instanceof Request ? entrada.url : String(entrada),
		);
		expect(url.pathname).toBe("/rest/v1/versiones_contenido");
		expect(url.searchParams.get("select")).toBe("json");
		expect(url.searchParams.get("estado")).toBe("eq.publicada");
	});

	it("lanza un error si Supabase responde con error", async () => {
		vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
			Response.json(
				{ code: "42501", message: "permission denied" },
				{ status: 401 },
			),
		);
		await expect(leerContenidoPrincipal()).rejects.toThrow(/versión publicada/);
	});
});

describe("archivos de public/", () => {
	it("el JSON de prueba y el respaldo cumplen el contrato", async () => {
		const { esquemaContenido } = await import(
			"../supabase/functions/_shared/esquemas/contenido"
		);
		const prueba = await import("../public/contenido-prueba.json");
		const respaldo = await import("../public/contenido-respaldo.json");
		expect(esquemaContenido.safeParse(prueba.default).success).toBe(true);
		expect(esquemaContenido.safeParse(respaldo.default).success).toBe(true);
	});
});
