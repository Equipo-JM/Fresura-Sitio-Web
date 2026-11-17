import { createClient } from "@supabase/supabase-js";
import { APICallError, type ModelMessage } from "ai";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	filasDeMensajes,
	productosConsultadosEnHistorial,
	reconstruirMensajes,
} from "../../supabase/functions/ia/agente/memoria";
import { crearRutaChat } from "../../supabase/functions/ia/skills/chat";
import ejemplo from "../datos/contenido-1.0.1.ejemplo.json";
import { guionDePrueba } from "../datos/guion";

const id = "12345678-1234-4234-8234-123456789abc";
const instruccion = {
	producto_id: "arma-tu-fresota",
	campana: null,
	objetivo: "dar_a_conocer",
	tono: "cercano",
	red: "tiktok",
	duracion_s: 15,
};
function respuestaTexto(texto = "Hola") {
	return {
		stream: simulateReadableStream({
			chunks: [
				{ type: "text-start" as const, id: "t" },
				{ type: "text-delta" as const, id: "t", delta: texto },
				{ type: "text-end" as const, id: "t" },
				{
					type: "finish" as const,
					finishReason: { unified: "stop" as const, raw: undefined },
					usage: {
						inputTokens: {
							total: 1,
							noCache: 1,
							cacheRead: undefined,
							cacheWrite: undefined,
						},
						outputTokens: { total: 1, text: 1, reasoning: undefined },
					},
				},
			],
		}),
	};
}
function respuestaHerramienta(
	nombre: string,
	entrada: unknown,
	llamada: string,
) {
	return {
		stream: simulateReadableStream({
			chunks: [
				{
					type: "tool-call" as const,
					toolCallId: llamada,
					toolName: nombre,
					input: JSON.stringify(entrada),
				},
				{
					type: "finish" as const,
					finishReason: { unified: "tool-calls" as const, raw: undefined },
					usage: {
						inputTokens: {
							total: 1,
							noCache: 1,
							cacheRead: undefined,
							cacheWrite: undefined,
						},
						outputTokens: { total: 1, text: 1, reasoning: undefined },
					},
				},
			],
		}),
	};
}
function preparar(
	modelo = new MockLanguageModelV3({ doStream: respuestaTexto() }),
	historial: ModelMessage[] = [],
) {
	const guardados: ReturnType<typeof filasDeMensajes> = [];
	let existe = true;
	const crearModelo = vi.fn(() => modelo);
	const ruta = crearRutaChat({
		claveGemini: "ficticia",
		modeloAgente: "principal",
		modeloRespaldo: "respaldo",
		crearModelo,
		crearCliente: (jwt) =>
			createClient("https://prueba.supabase.co", "publica-ficticia", {
				auth: { persistSession: false, autoRefreshToken: false },
				global: {
					headers: { Authorization: `Bearer ${jwt}` },
					fetch: async (entrada, opciones) => {
						const url = new URL(String(entrada));
						expect(new Headers(opciones?.headers).get("Authorization")).toBe(
							"Bearer administrador",
						);
						if (opciones?.method === "POST") {
							guardados.push(...JSON.parse(String(opciones.body)));
							return new Response(null, { status: 201 });
						}
						if (url.pathname.endsWith("agente_conversaciones"))
							return Response.json(existe ? { id } : null);
						if (url.pathname.endsWith("versiones_contenido"))
							return Response.json({ json: ejemplo });
						expect(url.searchParams.get("order")).toBe("creado_en.asc");
						return Response.json(filasDeMensajes(id, historial));
					},
				},
			}),
	});
	return {
		guardados,
		crearModelo,
		sinConversacion: () => {
			existe = false;
		},
		pedir: (cuerpo: unknown = { conversacion_id: id, mensaje: " Hola " }) =>
			ruta({
				peticion: new Request("https://prueba/ia/chat", {
					method: "POST",
					body: JSON.stringify(cuerpo),
				}),
				jwt: "administrador",
				usuario: "admin",
				cors: { "Access-Control-Allow-Origin": "https://sitio.test" },
			}),
	};
}
afterEach(() => vi.restoreAllMocks());
describe("POST /chat", () => {
	it.each([
		{ mensaje: "hola" },
		{ conversacion_id: id, mensaje: " " },
		{ conversacion_id: id, mensaje: "hola", extra: true },
	])("rechaza cuerpo inválido", async (cuerpo) => {
		const p = preparar();
		expect((await p.pedir(cuerpo)).status).toBe(400);
		expect(p.guardados).toHaveLength(0);
	});
	it("oculta conversaciones inexistentes", async () => {
		const p = preparar();
		p.sinConversacion();
		expect((await p.pedir()).status).toBe(404);
	});
	it("responde en flujo con CORS y persiste ambos mensajes", async () => {
		const p = preparar();
		const respuesta = await p.pedir();
		expect(respuesta.headers.get("Access-Control-Allow-Origin")).toBe(
			"https://sitio.test",
		);
		expect(respuesta.headers.get("content-type")).toContain(
			"text/event-stream",
		);
		expect(await respuesta.text()).toContain('"delta":"Hola"');
		expect(p.guardados.map((f) => f.rol)).toEqual(["administrador", "agente"]);
		expect(p.guardados[0].contenido.content).toBe("Hola");
	});
	it("añade aviso de precio sin registrar el texto", async () => {
		const registro = vi.spyOn(console, "error").mockImplementation(() => {});
		const p = preparar(
			new MockLanguageModelV3({ doStream: respuestaTexto("Cuesta $999999") }),
		);
		expect(await (await p.pedir()).text()).toContain(
			'"aviso":{"tipo":"precio_no_publicado"',
		);
		expect(JSON.stringify(registro.mock.calls)).not.toContain("999999");
	});
	it("acepta el nombre publicado de una sede", async () => {
		const p = preparar(
			new MockLanguageModelV3({
				doStream: respuestaTexto("Visita la Sede U Nacional."),
			}),
		);
		expect(await (await p.pedir()).text()).not.toContain('"aviso"');
	});

	it("avisa sobre una sede explícita no publicada", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const p = preparar(
			new MockLanguageModelV3({
				doStream: respuestaTexto("Visita la sede de Atlantis."),
			}),
		);
		expect(await (await p.pedir()).text()).toContain(
			'"aviso":{"tipo":"sede_no_publicada"',
		);
	});

	it("reintenta el 503 y envía el mensaje seguro si falla el respaldo", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const p = preparar(
			new MockLanguageModelV3({
				doStream: async () => {
					throw new APICallError({
						message: "secreto privado",
						url: "https://proveedor.test",
						requestBodyValues: {},
						statusCode: 503,
					});
				},
			}),
		);
		const texto = await (await p.pedir()).text();
		expect(p.crearModelo.mock.calls).toEqual([["principal"], ["respaldo"]]);
		expect(texto).toContain(
			"No se pudo generar el guion. Inténtalo de nuevo en unos minutos.",
		);
		expect(texto).not.toContain("secreto");
		expect(p.guardados).toHaveLength(1);
	});
	it("usa respaldo exitoso tras cupo diario sin duplicar el mensaje del administrador", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		let llamadas = 0;
		const p = preparar(
			new MockLanguageModelV3({
				doStream: async () => {
					if (llamadas++ === 0)
						throw new APICallError({
							message: "RequestsPerDay",
							url: "https://proveedor.test",
							requestBodyValues: {},
							statusCode: 429,
						});
					return respuestaTexto();
				},
			}),
		);
		const texto = await (await p.pedir()).text();
		expect(texto).toContain('"delta":"Hola"');
		expect(p.crearModelo.mock.calls).toEqual([["principal"], ["respaldo"]]);
		expect(p.guardados.map((f) => f.rol)).toEqual(["administrador", "agente"]);
	});
	it("no repite un turno que ya emitió texto", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const p = preparar(
			new MockLanguageModelV3({
				doStream: {
					stream: simulateReadableStream({
						chunks: [
							{ type: "text-start" as const, id: "t" },
							{ type: "text-delta" as const, id: "t", delta: "Hola" },
							{
								type: "error" as const,
								error: new APICallError({
									message: "privado",
									url: "https://proveedor.test",
									requestBodyValues: {},
									statusCode: 503,
								}),
							},
						],
					}),
				},
			}),
		);
		const texto = await (await p.pedir()).text();
		expect(p.crearModelo).toHaveBeenCalledTimes(1);
		expect(texto).toContain("No se pudo generar el guion.");
		expect(texto).not.toContain("privado");
	});

	it("consulta producto, entrega tarjeta y guarda resultados", async () => {
		const p = preparar(
			new MockLanguageModelV3({
				doStream: [
					respuestaHerramienta(
						"ver_producto",
						{ producto_id: instruccion.producto_id },
						"a",
					),
					respuestaHerramienta(
						"entregar_guion",
						{ instruccion, guion: guionDePrueba() },
						"b",
					),
					respuestaTexto(),
				],
			}),
		);
		const texto = await (await p.pedir()).text();
		expect(texto).toContain('"tarjetaGuion":{"instruccion":');
		expect(p.guardados.filter((f) => f.rol === "herramienta")).toHaveLength(2);
	});
	it("precarga fichas de turnos anteriores para entregar", async () => {
		const p = preparar(
			new MockLanguageModelV3({
				doStream: [
					respuestaHerramienta(
						"entregar_guion",
						{ instruccion, guion: guionDePrueba() },
						"b",
					),
					respuestaTexto(),
				],
			}),
			historialProducto(),
		);
		expect(await (await p.pedir()).text()).toContain('"tarjetaGuion"');
	});
});
function historialProducto(): ModelMessage[] {
	return [
		{
			role: "assistant",
			content: [
				{
					type: "tool-call",
					toolName: "ver_producto",
					toolCallId: "a",
					input: { producto_id: instruccion.producto_id },
				},
			],
		},
		{
			role: "tool",
			content: [
				{
					type: "tool-result",
					toolName: "ver_producto",
					toolCallId: "a",
					output: { type: "json", value: { nombre: "Arma tu Fresota" } },
				},
			],
		},
	];
}
describe("memoria del SDK", () => {
	it("conserva texto, llamadas y resultados al convertir ida y vuelta", () => {
		const mensajes: ModelMessage[] = [
			{ role: "user", content: "hola" },
			...historialProducto(),
			{ role: "assistant", content: "listo" },
		];
		const filas = filasDeMensajes(id, mensajes);
		expect(reconstruirMensajes(filas)).toEqual(mensajes);
		expect(filas.map((f) => f.rol)).toEqual([
			"administrador",
			"agente",
			"herramienta",
			"agente",
		]);
		expect(new Set(filas.map((f) => f.creado_en)).size).toBe(4);
		expect(productosConsultadosEnHistorial(reconstruirMensajes(filas))).toEqual(
			new Set([instruccion.producto_id]),
		);
	});
	it("no acredita llamadas sin resultado ni resultados fallidos", () => {
		expect(
			productosConsultadosEnHistorial(historialProducto().slice(0, 1)).size,
		).toBe(0);
		const mensajes = historialProducto();
		mensajes[1] = {
			role: "tool",
			content: [
				{
					type: "tool-result",
					toolName: "ver_producto",
					toolCallId: "a",
					output: { type: "json", value: { error: "no existe" } },
				},
			],
		};
		expect(productosConsultadosEnHistorial(mensajes).size).toBe(0);
	});
});
