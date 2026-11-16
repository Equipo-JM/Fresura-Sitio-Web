import { createClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LlamarModelo } from "../../supabase/functions/ia/proveedor/generar";
import { crearRutaGuion } from "../../supabase/functions/ia/skills/guion";
import ejemplo from "../datos/contenido-1.0.1.ejemplo.json";
import { guionDePrueba } from "../datos/guion";

const instruccionValida = {
	producto_id: "arma-tu-fresota",
	campana: null,
	objetivo: "dar_a_conocer",
	tono: "cercano",
	red: "tiktok",
	duracion_s: 15,
};

function preparar() {
	let fila: { json: unknown } | null = { json: structuredClone(ejemplo) };
	let falloLectura = false;
	const consultas: { url: URL; autorizacion: string | null }[] = [];
	const fetchSimulado: typeof fetch = async (entrada, opciones) => {
		const url = new URL(String(entrada));
		consultas.push({
			url,
			autorizacion: new Headers(opciones?.headers).get("Authorization"),
		});
		return Response.json(
			falloLectura ? { message: "datos privados", code: "XX000" } : fila,
			{ status: falloLectura ? 500 : 200 },
		);
	};
	const llamar = vi.fn<LlamarModelo>().mockResolvedValue({
		texto: JSON.stringify(guionDePrueba()),
		bloqueado: false,
	});
	const ruta = crearRutaGuion({
		crearCliente: (jwt) =>
			createClient("https://prueba.supabase.co", "clave-publicable-ficticia", {
				auth: { persistSession: false, autoRefreshToken: false },
				global: {
					headers: { Authorization: `Bearer ${jwt}` },
					fetch: fetchSimulado,
				},
			}),
		llamar,
		modeloPrincipal: "principal",
		modeloRespaldo: "respaldo",
	});
	const pedir = (cuerpo: unknown = instruccionValida) =>
		ruta({
			peticion: new Request("https://prueba/ia/guion", {
				method: "POST",
				body: JSON.stringify(cuerpo),
			}),
			jwt: "jwt-admin-ficticio",
			usuario: "admin",
			cors: { "Access-Control-Allow-Origin": "https://sitio.test" },
		});
	return {
		pedir,
		llamar,
		consultas,
		sinPublicada: () => {
			fila = null;
		},
		fallarLectura: () => {
			falloLectura = true;
		},
	};
}

afterEach(() => vi.restoreAllMocks());

describe("POST /guion (IF-09)", () => {
	it("genera el guion con la versión publicada leída con el JWT del administrador", async () => {
		const p = preparar();
		const respuesta = await p.pedir();
		expect(respuesta.status).toBe(200);
		expect(await respuesta.json()).toEqual({
			guion: guionDePrueba(),
			modelo: "principal",
		});
		expect(p.consultas).toHaveLength(1);
		expect(p.consultas[0].url.pathname).toMatch(/\/versiones_contenido$/);
		expect(p.consultas[0].url.searchParams.get("estado")).toBe("eq.publicada");
		expect(p.consultas[0].autorizacion).toBe("Bearer jwt-admin-ficticio");
		expect(p.llamar.mock.calls[0][0].prompt.usuario).toContain(
			"Arma tu Fresota",
		);
	});

	it.each([
		{ ...instruccionValida, red: "otra" },
		{ ...instruccionValida, extra: "dato" },
		{ ...instruccionValida, producto_id: "" },
	])(
		"rechaza una instrucción inválida sin leer ni generar: %j",
		async (cuerpo) => {
			const p = preparar();
			const respuesta = await p.pedir(cuerpo);
			expect(respuesta.status).toBe(400);
			expect((await respuesta.json()).error).toBe("datos_no_validos");
			expect(p.consultas).toHaveLength(0);
			expect(p.llamar).not.toHaveBeenCalled();
		},
	);

	it("responde 409 si no hay versión publicada", async () => {
		const p = preparar();
		p.sinPublicada();
		const respuesta = await p.pedir();
		expect(respuesta.status).toBe(409);
		expect((await respuesta.json()).error).toBe("sin_publicada");
		expect(p.llamar).not.toHaveBeenCalled();
	});

	it("responde 404 si el producto no existe", async () => {
		const p = preparar();
		const respuesta = await p.pedir({
			...instruccionValida,
			producto_id: "no-existe",
		});
		expect(respuesta.status).toBe(404);
		expect((await respuesta.json()).error).toBe("producto_no_encontrado");
		expect(p.llamar).not.toHaveBeenCalled();
	});

	it("lanza un error genérico si falla la lectura, para que el servidor lo sanee", async () => {
		const p = preparar();
		p.fallarLectura();
		await expect(p.pedir()).rejects.toThrow("lectura_contenido");
	});

	it("DD-20: responde el fallo de la IA y lo registra sin el mensaje del proveedor", async () => {
		const p = preparar();
		const registro = vi.spyOn(console, "error").mockImplementation(() => {});
		p.llamar.mockRejectedValue(
			Object.assign(new Error("UNAVAILABLE secreto"), { status: 503 }),
		);
		const respuesta = await p.pedir();
		expect(respuesta.status).toBe(504);
		expect((await respuesta.json()).error).toBe("ia_tiempo");
		expect(p.llamar.mock.calls.map(([c]) => c.modelo)).toEqual([
			"principal",
			"respaldo",
		]);
		expect(registro).toHaveBeenCalledTimes(1);
		expect(registro.mock.calls[0][0]).not.toContain("secreto");
		expect(JSON.parse(registro.mock.calls[0][0])).toEqual({
			fecha: expect.any(String),
			tipo: "ia_tiempo",
			estado_proveedor: 503,
		});
	});
});
