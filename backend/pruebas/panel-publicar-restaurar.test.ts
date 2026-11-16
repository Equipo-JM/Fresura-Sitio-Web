import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { crearServidor } from "../supabase/functions/_shared/servidor";
import {
	decidirFotosParaBorrar,
	extraerFotosEnUso,
} from "../supabase/functions/panel/limpiarFotos";
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
				if (paso === undefined && String(url).includes("select=json")) {
					return Response.json([]);
				}
				if (paso === undefined && String(url).includes("/object/list/fotos")) {
					return Response.json([]);
				}
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
		rutas: crearRutasPanel(cliente, registrarFallo),
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
				"GET",
				"POST",
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
		expect(prueba.solicitudes).toHaveLength(5);
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

const nombreFoto = (letra: string) => `${letra.repeat(64)}.webp`;
const rutaFoto = (letra: string) =>
	`https://prueba.supabase.co/storage/v1/object/public/fotos/${nombreFoto(letra)}`;
const objetoFoto = (letra: string, created_at = "2000-01-01T00:00:00Z") => ({
	name: nombreFoto(letra),
	id: letra,
	created_at,
	updated_at: created_at,
	last_accessed_at: created_at,
	metadata: {},
});

function publicarConLimpieza(...pasos: Paso[]) {
	return preparar(
		{ datos: borrador() },
		{ datos: ID },
		{ datos: { publicada_en: FECHA } },
		...pasos,
	);
}

describe("limpieza después de publicar", () => {
	it("reconoce nombres JPEG y rutas con caracteres codificados sin contar rutas inválidas", () => {
		const fotos = extraerFotosEnUso({
			productos: [
				{ imagen: { ruta: rutaFoto("a").replace("/aaa", "/%61aa") } },
				{ imagen: { ruta: rutaFoto("b").replace(".webp", ".jpg") } },
				{ imagen: { ruta: "https://[url-invalida" } },
				{ imagen: { ruta: "/ejemplos/fresita.webp" } },
			],
		});
		expect([...fotos]).toEqual([nombreFoto("a"), `${"b".repeat(64)}.jpg`]);
	});
	it("conserva imágenes de las tres versiones y recientes; borra solo viejas sin uso", async () => {
		const prueba = publicarConLimpieza(
			{
				datos: [
					{ json: { productos: [{ imagen: { ruta: rutaFoto("a") } }] } },
					{ json: { productos: [{ imagen: { ruta: rutaFoto("b") } }] } },
					{ json: { productos: [{ imagen: { ruta: rutaFoto("c") } }] } },
				],
			},
			{
				datos: [
					objetoFoto("a"),
					objetoFoto("b"),
					objetoFoto("c"),
					objetoFoto("d", new Date(Date.now() - 1000).toISOString()),
					objetoFoto("e"),
				],
			},
			{ datos: [] },
		);
		const respuesta = await prueba.pedir("publicar");
		expect(respuesta.status).toBe(200);
		const borrados = prueba.solicitudes.filter((p) => p.method === "DELETE");
		expect(borrados).toHaveLength(1);
		expect(await borrados[0].json()).toEqual({ prefixes: [nombreFoto("e")] });
		expect(new URL(prueba.solicitudes[3].url).searchParams.get("estado")).toBe(
			"in.(publicada,anterior,borrador)",
		);
		expect(prueba.registrarFallo).not.toHaveBeenCalled();
	});

	it("conserva todo nombre de foto citado en imagen.ruta, venga del dominio que venga", async () => {
		const prueba = publicarConLimpieza(
			{
				datos: [
					{
						json: {
							bloques: [
								{ imagen: { ruta: `/ejemplos/${nombreFoto("a")}` } },
								{ imagen: { ruta: rutaFoto("b").replace("prueba.", "otro.") } },
								{
									imagen: { ruta: rutaFoto("c").replace("/fotos/", "/otro/") },
								},
								{ ruta: rutaFoto("d") },
								{ imagen: { ruta: `${rutaFoto("e")}?v=1` } },
							],
						},
					},
				],
			},
			{ datos: ["a", "b", "c", "d", "e"].map((letra) => objetoFoto(letra)) },
			{ datos: [] },
		);
		expect((await prueba.pedir("publicar")).status).toBe(200);
		const borrado = prueba.solicitudes.find((p) => p.method === "DELETE");
		expect(borrado).toBeDefined();
		// Solo `d` se borra: no está en un `imagen.ruta`. Las demás se conservan aunque
		// su ruta apunte a otro dominio o carpeta: borrar una foto en uso no tiene arreglo.
		expect(await borrado?.json()).toEqual({ prefixes: [nombreFoto("d")] });
	});

	it.each(["versiones", "listado", "borrado", "red"])(
		"200 y registro sin datos sensibles si falla %s",
		async (etapa) => {
			const fallo = { datos: { message: CLAVE }, estado: 500 };
			const pasos: Paso[] =
				etapa === "versiones"
					? [fallo]
					: etapa === "red"
						? [new Error(CLAVE)]
						: [
								{ datos: [] },
								...(etapa === "listado"
									? [fallo]
									: [{ datos: [objetoFoto("a")] }, fallo]),
							];
			const prueba = publicarConLimpieza(...pasos);
			const respuesta = await prueba.pedir("publicar");
			expect(respuesta.status).toBe(200);
			expect(await respuesta.json()).toEqual({ publicada_en: FECHA });
			expect(prueba.registrarFallo.mock.calls).toEqual([["limpieza_fotos"]]);
		},
	);

	it("restaurar no consulta versiones ni Storage para limpiar", async () => {
		const prueba = preparar(
			{ datos: null },
			{ datos: { publicada_en: FECHA } },
		);
		expect((await prueba.pedir("restaurar", {})).status).toBe(200);
		expect(prueba.solicitudes).toHaveLength(2);
	});

	it("lista todas las páginas antes de borrar para no saltar objetos", async () => {
		const pagina = Array.from({ length: 100 }, (_, i) => ({
			...objetoFoto("a"),
			name: `${i.toString(16).padStart(64, "0")}.jpg`,
		}));
		const prueba = publicarConLimpieza(
			{ datos: [] },
			{ datos: pagina },
			{ datos: [objetoFoto("b")] },
			{ datos: [] },
			{ datos: [] },
		);
		expect((await prueba.pedir("publicar")).status).toBe(200);
		expect(await prueba.solicitudes[5].json()).toMatchObject({ offset: 100 });
		expect(prueba.solicitudes[6].method).toBe("DELETE");
		expect((await prueba.solicitudes[6].json()).prefixes).toHaveLength(100);
		expect(await prueba.solicitudes[7].json()).toEqual({
			prefixes: [nombreFoto("b")],
		});
	});

	it("conserva fotos con 24 horas exactas, fechas inválidas o nombres ajenos al contrato", () => {
		const ahora = Date.parse("2026-11-16T12:00:00Z");
		expect(
			decidirFotosParaBorrar(
				[
					objetoFoto("a", "2026-11-15T12:00:00Z"),
					objetoFoto("b", "2026-11-15T11:59:59.999Z"),
					objetoFoto("c", "fecha inválida"),
					{ name: nombreFoto("d"), created_at: null },
					{ name: "carpeta", created_at: "2000-01-01T00:00:00Z" },
				],
				new Set(),
				ahora,
			),
		).toEqual([nombreFoto("b")]);
	});
});
