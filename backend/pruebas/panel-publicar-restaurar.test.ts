import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { crearServidor } from "../supabase/functions/_shared/servidor";
import { crearRutasPanel } from "../supabase/functions/panel/rutas";
import casos from "./datos/contenido-1.0.1.casos.json";
import ejemplo from "./datos/contenido-1.0.1.ejemplo.json";

const ORIGEN = "http://localhost:5173";
const CLAVE = "sb_secret_ficticia_solo_pruebas";
const FECHA = "2026-11-16T12:00:00+00:00";
const ID = "11111111-1111-4111-8111-111111111111";
const entrada = { revision: 3, contenido_real: false };
const borrador = (json: unknown = ejemplo) => ({ id: ID, revision: 3, json });
type Paso = { datos: unknown; estado?: number } | Error;

function preparar(...pasos: Paso[]) {
	const solicitudes: Request[] = [];
	const cliente = createClient("https://prueba.supabase.co", CLAVE, {
		auth: { persistSession: false, autoRefreshToken: false },
		db: { retry: false },
		global: {
			fetch: async (url, opciones) => {
				solicitudes.push(new Request(url, opciones));
				const paso = pasos.shift();
				if (paso === undefined) throw new Error("Consulta no esperada");
				if (paso instanceof Error) throw paso;
				return new Response(JSON.stringify(paso.datos), {
					status: paso.estado ?? 200,
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	});
	const registrarFallo = vi.fn();
	const atender = crearServidor({
		origenesPermitidos: [ORIGEN],
		verificarJwt: async () => ({
			sub: ID,
			aal: "aal2",
			app_metadata: { rol: "admin" },
		}),
		rutas: crearRutasPanel(cliente),
		mensajeSinPermiso: "Sin permiso.",
		mensajeErrorInterno: "No se pudo publicar. El sitio sigue igual.",
		registrarFallo,
	});
	return {
		solicitudes,
		registrarFallo,
		pedir: (ruta: string, cuerpo: unknown = entrada, texto?: string) =>
			atender(
				new Request(`https://prueba.supabase.co/functions/v1/panel/${ruta}`, {
					method: "POST",
					headers: {
						Origin: ORIGEN,
						Authorization: "Bearer admin",
						"Content-Type": "application/json",
					},
					body: texto ?? JSON.stringify(cuerpo),
				}),
			),
	};
}

describe("POST /publicar", () => {
	it.each(casos)("400: no publica el caso del contrato $caso", async (caso) => {
		const json: unknown = structuredClone(ejemplo);
		let nodo = json as Record<string | number, unknown>;
		for (const paso of caso.ruta.slice(0, -1)) {
			nodo = nodo[paso] as Record<string | number, unknown>;
		}
		const campo = caso.ruta[caso.ruta.length - 1];
		if (caso.op === "quitar") delete nodo[campo];
		else nodo[campo] = caso.valor;
		const prueba = preparar({ datos: borrador(json) });
		const respuesta = await prueba.pedir("publicar");
		expect(respuesta.status).toBe(400);
		expect(await respuesta.json()).toEqual({
			error: "contenido_no_valido",
			mensaje: expect.stringContaining("Revisa"),
		});
		expect(prueba.solicitudes).toHaveLength(1);
	});
	it.each(["ejemplo", "real"])(
		"200: contenido_real false conserva %s sin guardar de nuevo",
		async (estado) => {
			const prueba = preparar(
				{ datos: borrador({ ...ejemplo, estado }) },
				{ datos: ID },
				{ datos: { publicada_en: FECHA } },
			);
			const respuesta = await prueba.pedir("publicar");
			expect(respuesta.status).toBe(200);
			expect(await respuesta.json()).toEqual({ publicada_en: FECHA });
			expect(respuesta.headers.get("Access-Control-Allow-Origin")).toBe(ORIGEN);
			expect(prueba.solicitudes.map((p) => p.method)).toEqual([
				"GET",
				"POST",
				"GET",
			]);
			expect(await prueba.solicitudes[1].json()).toEqual({
				revision_esperada: 3,
				usuario: ID,
			});
			expect(new URL(prueba.solicitudes[2].url).searchParams.get("id")).toBe(
				`eq.${ID}`,
			);
		},
	);
	it("200: contenido_real true guarda real con control de revisión y publica la nueva", async () => {
		const prueba = preparar(
			{ datos: borrador() },
			{ datos: { revision: 4 } },
			{ datos: ID },
			{ datos: { publicada_en: FECHA } },
		);
		expect(
			(await prueba.pedir("publicar", { ...entrada, contenido_real: true }))
				.status,
		).toBe(200);
		const guardado = prueba.solicitudes[1];
		expect(guardado.method).toBe("PATCH");
		expect(await guardado.json()).toEqual({
			json: { ...ejemplo, estado: "real" },
		});
		const filtros = new URL(guardado.url).searchParams;
		expect(filtros.get("id")).toBe(`eq.${ID}`);
		expect(filtros.get("estado")).toBe("eq.borrador");
		expect(filtros.get("revision")).toBe("eq.3");
		expect(await prueba.solicitudes[2].json()).toEqual({
			revision_esperada: 4,
			usuario: ID,
		});
	});
	it("200: no escribe si el contenido ya era real", async () => {
		const prueba = preparar(
			{ datos: borrador({ ...ejemplo, estado: "real" }) },
			{ datos: ID },
			{ datos: { publicada_en: FECHA } },
		);
		expect(
			(await prueba.pedir("publicar", { ...entrada, contenido_real: true }))
				.status,
		).toBe(200);
		expect(prueba.solicitudes).toHaveLength(3);
	});
	it.each(
		[
			{},
			null,
			[],
			{ revision: 0, contenido_real: true },
			{ revision: 1.5, contenido_real: true },
			{ revision: "3", contenido_real: true },
			{ revision: 3, contenido_real: "false" },
			{ ...entrada, otro: true },
		].map((cuerpo) => [cuerpo]),
	)("400: rechaza entrada inválida %j antes de consultar", async (cuerpo) => {
		const prueba = preparar();
		expect((await prueba.pedir("publicar", cuerpo)).status).toBe(400);
		expect(prueba.solicitudes).toHaveLength(0);
	});
	it("404: sin borrador", async () => {
		const respuesta = await preparar({ datos: null }).pedir("publicar");
		expect(respuesta.status).toBe(404);
		expect(await respuesta.json()).toEqual({
			error: "sin_borrador",
			mensaje: "No hay cambios por publicar.",
		});
	});
	it("409: revisión leída distinta", async () => {
		const prueba = preparar({ datos: borrador() });
		expect(
			(await prueba.pedir("publicar", { ...entrada, revision: 2 })).status,
		).toBe(409);
		expect(prueba.solicitudes).toHaveLength(1);
	});
	it("409: una edición concurrente impide guardar real", async () => {
		const prueba = preparar({ datos: borrador() }, { datos: null });
		expect(
			(await prueba.pedir("publicar", { ...entrada, contenido_real: true }))
				.status,
		).toBe(409);
		expect(prueba.solicitudes).toHaveLength(2);
	});
	it("409: conflicto_borrador en la transacción", async () => {
		const respuesta = await preparar(
			{ datos: borrador() },
			{ datos: { code: "P0001", message: "conflicto_borrador" }, estado: 400 },
		).pedir("publicar");
		expect(respuesta.status).toBe(409);
	});
	it.each([
		null,
		{
			...ejemplo,
			productos: [{ ...ejemplo.productos[0], categoria: "inexistente" }],
		},
	])("400: contenido inválido no se guarda ni publica", async (json) => {
		const prueba = preparar({ datos: borrador(json) });
		const respuesta = await prueba.pedir("publicar", {
			...entrada,
			contenido_real: true,
		});
		expect(respuesta.status).toBe(400);
		expect(await respuesta.json()).toMatchObject({
			error: "contenido_no_valido",
			mensaje: expect.stringContaining("Revisa"),
		});
		expect(prueba.solicitudes).toHaveLength(1);
	});
});

describe("POST /restaurar", () => {
	it("200: restaura y consulta la fecha de la publicada", async () => {
		const prueba = preparar(
			{ datos: null },
			{ datos: { publicada_en: FECHA } },
		);
		const respuesta = await prueba.pedir("restaurar", {});
		expect(respuesta.status).toBe(200);
		expect(await respuesta.json()).toEqual({ publicada_en: FECHA });
		expect(new URL(prueba.solicitudes[0].url).pathname).toBe(
			"/rest/v1/rpc/restaurar_anterior",
		);
		expect(new URL(prueba.solicitudes[1].url).searchParams.get("estado")).toBe(
			"eq.publicada",
		);
	});
	it.each([null, [], { otro: true }, "texto"].map((cuerpo) => [cuerpo]))(
		"400: rechaza %j",
		async (cuerpo) => {
			const prueba = preparar();
			expect((await prueba.pedir("restaurar", cuerpo)).status).toBe(400);
			expect(prueba.solicitudes).toHaveLength(0);
		},
	);
	it("404: sin_anterior", async () => {
		const respuesta = await preparar({
			datos: { code: "P0001", message: "sin_anterior" },
			estado: 400,
		}).pedir("restaurar", {});
		expect(respuesta.status).toBe(404);
		expect(await respuesta.json()).toEqual({
			error: "sin_anterior",
			mensaje: "No hay una versión anterior para restaurar.",
		});
	});
});

describe("fallos y privacidad", () => {
	it.each(["publicar", "restaurar"])(
		"413: %s conserva el límite común de tamaño",
		async (ruta) => {
			const prueba = preparar();
			expect(
				(await prueba.pedir(ruta, {}, "x".repeat(256 * 1024 + 1))).status,
			).toBe(413);
			expect(prueba.solicitudes).toHaveLength(0);
		},
	);
	it.each(["publicar", "restaurar"])(
		"500: %s rechaza una fecha de publicación ausente",
		async (ruta) => {
			const previos: Paso[] =
				ruta === "publicar"
					? [{ datos: borrador() }, { datos: ID }]
					: [{ datos: null }];
			const prueba = preparar(...previos, { datos: { publicada_en: null } });
			expect(
				(await prueba.pedir(ruta, ruta === "publicar" ? entrada : {})).status,
			).toBe(500);
		},
	);
	it.each(["publicar", "restaurar"])(
		"400: %s rechaza JSON roto",
		async (ruta) => {
			expect((await preparar().pedir(ruta, {}, "{")).status).toBe(400);
		},
	);
	it.each([
		["publicar", entrada, []],
		["publicar", { ...entrada, contenido_real: true }, [{ datos: borrador() }]],
		["publicar", entrada, [{ datos: borrador() }]],
		["publicar", entrada, [{ datos: borrador() }, { datos: ID }]],
		["restaurar", {}, []],
		["restaurar", {}, [{ datos: null }]],
	] as [string, unknown, Paso[]][])(
		"500: %s oculta errores en cada etapa",
		async (ruta, cuerpo, previos) => {
			const prueba = preparar(...previos, {
				datos: {
					code: "XX000",
					message: CLAVE,
					details: JSON.stringify(ejemplo),
					hint: CLAVE,
				},
				estado: 500,
			});
			const respuesta = await prueba.pedir(ruta, cuerpo);
			expect(respuesta.status).toBe(500);
			expect(await respuesta.json()).toEqual({
				error: "error_interno",
				mensaje: "No se pudo publicar. El sitio sigue igual.",
			});
			expect(prueba.registrarFallo).toHaveBeenCalledWith(
				ruta === "publicar" ? "publicacion" : "restauracion",
			);
			expect(JSON.stringify(prueba.registrarFallo.mock.calls)).not.toContain(
				CLAVE,
			);
			expect(JSON.stringify(prueba.registrarFallo.mock.calls)).not.toContain(
				ejemplo.negocio.whatsapp,
			);
		},
	);
	it.each(["publicar", "restaurar"])(
		"500: %s oculta también una excepción de red con secretos",
		async (ruta) => {
			const prueba = preparar(new Error(CLAVE));
			const respuesta = await prueba.pedir(
				ruta,
				ruta === "publicar" ? entrada : {},
			);
			expect(respuesta.status).toBe(500);
			expect(await respuesta.text()).not.toContain(CLAVE);
			expect(JSON.stringify(prueba.registrarFallo.mock.calls)).not.toContain(
				CLAVE,
			);
		},
	);
});
