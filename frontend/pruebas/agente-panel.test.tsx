import { createClient } from "@supabase/supabase-js";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { createUIMessageStreamResponse, type UIMessageChunk } from "ai";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tituloConversacion } from "../../backend/supabase/functions/_shared/esquemas/chat";
import { convertirHistorial } from "../src/panel/agente/servicioConversaciones";
import { GuionesPanel } from "../src/panel/guiones/GuionesPanel";
import type { Database } from "../src/tipos/database.types";

const id = "a0a0a0a0-1111-4111-8111-111111111111";
const tarjeta = {
	instruccion: {
		producto_id: "fresas",
		campana: null,
		objetivo: "dar_a_conocer" as const,
		tono: "Cercano",
		red: "instagram" as const,
		duracion_s: 30 as const,
	},
	guion: {
		titulo: "Antojo Fresura",
		gancho: "Ven a probar",
		escenas: [
			{
				inicio_s: 0,
				fin_s: 30,
				que_se_ve: "Fresas",
				texto_pantalla: "Un antojo",
				voz: "Disfrútalo",
			},
		],
		llamado_accion: "Escríbenos",
		texto_publicacion: "Hoy",
		musica_sugerida: "Suave",
		notas_produccion: "Luz natural",
	},
};
const conversacion = {
	id,
	titulo: "Quiero un guion",
	actualizado_en: "2026-11-17T12:00:00Z",
};
function flujo(partes: UIMessageChunk[]) {
	return createUIMessageStreamResponse({
		stream: new ReadableStream({
			start(controlador) {
				for (const parte of partes) controlador.enqueue(parte);
				controlador.close();
			},
		}),
	});
}
function respuesta(metadata = {}) {
	return flujo([
		{ type: "start", messageId: "respuesta-1" },
		{ type: "text-start", id: "texto" },
		{ type: "text-delta", id: "texto", delta: "Vamos a preparar tu guion" },
		{ type: "text-end", id: "texto" },
		{ type: "finish", finishReason: "stop", messageMetadata: metadata },
	]);
}
function simular(
	iniciales: boolean | (typeof conversacion)[] = false,
	historial: { id: string; contenido: unknown }[] = [],
) {
	let filas = Array.isArray(iniciales)
		? iniciales
		: iniciales
			? [conversacion]
			: [];
	let token = "token-inicial-ficticio";
	let responder = () => respuesta();
	const peticiones: { cuerpo: unknown; autorizacion: string | null }[] = [];
	const guardados: unknown[] = [];
	const fetchSimulado = vi.fn(
		async (entrada: RequestInfo | URL, opciones?: RequestInit) => {
			const url = String(entrada);
			if (url.includes("/functions/v1/ia/chat")) {
				peticiones.push({
					cuerpo: JSON.parse(String(opciones?.body)),
					autorizacion: new Headers(opciones?.headers).get("Authorization"),
				});
				return responder();
			}
			if (url.includes("biblioteca_piezas")) {
				guardados.push(JSON.parse(String(opciones?.body)));
				return new Response(null, { status: 201 });
			}
			if (url.includes("agente_conversaciones")) {
				if (opciones?.method === "POST") {
					const fila = {
						...conversacion,
						titulo: JSON.parse(String(opciones.body)).titulo,
					};
					filas = [fila];
					return Response.json(fila);
				}
				if (opciones?.method === "DELETE") {
					const id = new URL(url).searchParams.get("id");
					filas = filas.filter((fila) => `eq.${fila.id}` !== id);
					return new Response(null, { status: 204 });
				}
				const parametros = new URL(url).searchParams;
				const desde = Number(parametros.get("offset") ?? "0");
				const limite = Number(parametros.get("limit") ?? filas.length);
				return Response.json(filas.slice(desde, desde + limite));
			}
			if (url.includes("agente_mensajes"))
				return Response.json(
					url.includes("creado_en.desc") ? [...historial].reverse() : historial,
				);
			throw new Error(`Petición inesperada: ${url}`);
		},
	);
	const cliente = createClient<Database>(
		"https://supabase.invalid",
		"clave-publica-ficticia",
		{
			global: { fetch: fetchSimulado },
			auth: {
				persistSession: false,
				autoRefreshToken: false,
				detectSessionInUrl: false,
				storageKey: `prueba-${crypto.randomUUID()}`,
			},
		},
	);
	vi.spyOn(cliente.auth, "getSession").mockImplementation(
		async () =>
			({ data: { session: { access_token: token } }, error: null }) as Awaited<
				ReturnType<typeof cliente.auth.getSession>
			>,
	);
	render(
		<MemoryRouter>
			<GuionesPanel cliente={cliente} irVersiones={vi.fn()} />
		</MemoryRouter>,
	);
	return {
		peticiones,
		guardados,
		fetchSimulado,
		cambiarToken: () => {
			token = "token-renovado-ficticio";
		},
		responder: (fn: () => Response) => {
			responder = fn;
		},
	};
}
function enviar(texto = "Quiero un guion") {
	fireEvent.change(screen.getByLabelText("Mensaje para el agente"), {
		target: { value: texto },
	});
	fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
}
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});
describe("conversión de memoria", () => {
	it("muestra solo texto visible de ambos roles", () => {
		expect(
			convertirHistorial([
				{ id: "u", contenido: { role: "user", content: "Hola" } },
				{
					id: "a",
					contenido: {
						role: "assistant",
						content: [
							{ type: "text", text: "Hola Fresura" },
							{ type: "reasoning", text: "Interno" },
						],
					},
				},
			]),
		).toEqual([
			{ id: "u", role: "user", parts: [{ type: "text", text: "Hola" }] },
			{
				id: "a",
				role: "assistant",
				parts: [{ type: "text", text: "Hola Fresura" }],
			},
		]);
	});
	it("reconstruye solo entregas válidas con resultado ok y llamada correspondiente", () => {
		const llamada = {
			id: "a",
			contenido: {
				role: "assistant",
				content: [
					{
						type: "tool-call",
						toolCallId: "entrega",
						toolName: "entregar_guion",
						input: tarjeta,
					},
				],
			},
		};
		const resultado = (ok: boolean, toolCallId = "entrega") => ({
			id: "h",
			contenido: {
				role: "tool",
				content: [
					{
						type: "tool-result",
						toolCallId,
						toolName: "entregar_guion",
						output: { type: "json", value: { ok } },
					},
				],
			},
		});
		expect(
			convertirHistorial([llamada, resultado(true)])[0].metadata?.tarjetaGuion,
		).toEqual(tarjeta);
		expect(convertirHistorial([llamada, resultado(false)])).toEqual([]);
		expect(convertirHistorial([llamada, resultado(true, "otra")])).toEqual([]);
	});
	it("limita títulos sin cortar palabras y normaliza espacios", () => {
		expect(tituloConversacion("  Quiero\n un guion  ")).toBe("Quiero un guion");
		expect(tituloConversacion(`${"palabra ".repeat(12)}`)).toBe(
			"palabra palabra palabra palabra palabra palabra palabra",
		);
		expect(tituloConversacion("a".repeat(80))).toHaveLength(60);
	});
});
describe("chat del panel", () => {
	it("asigna un nombre legible al iniciar con una respuesta numérica", async () => {
		simular();
		enviar("2");
		expect(
			await screen.findByRole("button", { name: "Publicación para redes" }),
		).toBeVisible();
		expect(screen.queryByRole("button", { name: /^2$/ })).toBeNull();
	});
	it("recupera el título del guion para conversaciones que antes se llamaban 1", async () => {
		simular(
			[{ ...conversacion, titulo: "1" }],
			[
				{ id: "u", contenido: { role: "user", content: "1" } },
				{
					id: "a",
					contenido: {
						role: "assistant",
						content: [
							{
								type: "tool-call",
								toolCallId: "tema",
								toolName: "entregar_guion",
								input: tarjeta,
							},
						],
					},
				},
				{
					id: "t",
					contenido: {
						role: "tool",
						content: [
							{
								type: "tool-result",
								toolCallId: "tema",
								toolName: "entregar_guion",
								output: { type: "json", value: { ok: true } },
							},
						],
					},
				},
			],
		);
		const antigua = await screen.findByRole("button", {
			name: tarjeta.guion.titulo,
		});
		fireEvent.click(antigua);
		expect(
			await screen.findByRole("heading", { name: tarjeta.guion.titulo }),
		).toBeVisible();
		expect(antigua).toHaveAttribute("aria-current", "true");
	});
	it("pagina el historial, permite abrir conversaciones anteriores y vuelve si queda una página vacía", async () => {
		const filas = Array.from({ length: 6 }, (_, i) => ({
			...conversacion,
			id: `a0a0a0a0-1111-4111-8111-${String(i).padStart(12, "0")}`,
			titulo: `Conversación ${i + 1}`,
		}));
		simular(filas);
		const anteriores = await screen.findByRole("button", {
			name: "Anteriores",
		});
		expect(
			screen.getByRole("button", { name: "Conversación 5" }),
		).toBeVisible();
		expect(screen.queryByRole("button", { name: "Conversación 6" })).toBeNull();
		fireEvent.click(anteriores);
		const antigua = await screen.findByRole("button", {
			name: "Conversación 6",
		});
		expect(anteriores).toBeDisabled();
		fireEvent.click(antigua);
		await waitFor(() =>
			expect(antigua).toHaveAttribute("aria-current", "true"),
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Borrar Conversación 6" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Confirmar borrado" }));
		expect(
			await screen.findByRole("button", { name: "Conversación 1" }),
		).toBeVisible();
		expect(screen.queryByRole("button", { name: "Anteriores" })).toBeNull();
	});
	it("envía únicamente el contrato y calcula Authorization otra vez en cada envío", async () => {
		const simulado = simular();
		enviar();
		expect(
			await screen.findByText("Vamos a preparar tu guion"),
		).toBeInTheDocument();
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Nueva conversación" }),
			).toBeEnabled(),
		);
		simulado.cambiarToken();
		enviar("Ahora para TikTok");
		await waitFor(() => expect(simulado.peticiones).toHaveLength(2));
		expect(simulado.peticiones).toEqual([
			{
				cuerpo: { conversacion_id: id, mensaje: "Quiero un guion" },
				autorizacion: "Bearer token-inicial-ficticio",
			},
			{
				cuerpo: { conversacion_id: id, mensaje: "Ahora para TikTok" },
				autorizacion: "Bearer token-renovado-ficticio",
			},
		]);
	});
	it("muestra texto antes de terminar el flujo y permite detener", async () => {
		const simulado = simular();
		let controlador: ReadableStreamDefaultController<UIMessageChunk>;
		simulado.responder(() =>
			createUIMessageStreamResponse({
				stream: new ReadableStream({
					start(c) {
						controlador = c;
						c.enqueue({ type: "start", messageId: "parcial" });
						c.enqueue({ type: "text-start", id: "t" });
						c.enqueue({
							type: "text-delta",
							id: "t",
							delta: "Respuesta parcial",
						});
					},
				}),
			}),
		);
		enviar();
		expect(await screen.findByText("Respuesta parcial")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "Detener" }));
		await act(async () => {
			controlador.enqueue({ type: "text-end", id: "t" });
			controlador.enqueue({ type: "finish" });
			controlador.close();
		});
	});
	it("Enter envía, Shift+Enter conserva el mensaje y el contador muestra el límite", async () => {
		const simulado = simular();
		const campo = screen.getByLabelText("Mensaje para el agente");
		fireEvent.change(campo, { target: { value: "Hola" } });
		expect(screen.getByText("4/2000 caracteres")).toBeInTheDocument();
		expect(campo).toHaveAttribute("maxlength", "2000");
		fireEvent.keyDown(campo, { key: "Enter", shiftKey: true });
		expect(simulado.peticiones).toHaveLength(0);
		expect(campo).toHaveValue("Hola");
		fireEvent.keyDown(campo, { key: "Enter" });
		expect(
			await screen.findByText("Vamos a preparar tu guion"),
		).toBeInTheDocument();
		expect(simulado.peticiones[0].cuerpo).toEqual({
			conversacion_id: id,
			mensaje: "Hola",
		});
	});
	it("muestra Consultando datos mientras una herramienta está pendiente", async () => {
		const simulado = simular();
		let controlador: ReadableStreamDefaultController<UIMessageChunk>;
		simulado.responder(() =>
			createUIMessageStreamResponse({
				stream: new ReadableStream({
					start(c) {
						controlador = c;
						c.enqueue({ type: "start", messageId: "herramientas" });
						c.enqueue({
							type: "tool-input-available",
							toolCallId: "consulta",
							toolName: "ver_producto",
							input: { producto_id: "fresas" },
						});
					},
				}),
			}),
		);
		enviar();
		expect(await screen.findByText("Consultando datos…")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Detener" }));
		await act(async () => {
			controlador.enqueue({ type: "finish" });
			controlador.close();
		});
	});
	it("un error sin JSON usa el mensaje genérico en español", async () => {
		const simulado = simular();
		simulado.responder(
			() => new Response("Service unavailable", { status: 503 }),
		);
		enviar();
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"No se pudo generar el guion. Inténtalo de nuevo en unos minutos.",
		);
	});

	it("muestra el guion completo y el aviso dentro del chat, sin acciones de revisión", async () => {
		const simulado = simular();
		simulado.responder(() =>
			respuesta({
				tarjetaGuion: {
					...tarjeta,
					instruccion: { ...tarjeta.instruccion, producto_id: null },
				},
				aviso: {
					tipo: "precio_no_publicado",
					mensaje: "Revisa los datos no publicados.",
				},
			}),
		);
		enviar();
		expect(
			await screen.findByRole("heading", { name: "Antojo Fresura" }),
		).toBeVisible();
		expect(screen.getByText(/Escena 1.*0.*30 s/)).toHaveTextContent(
			tarjeta.guion.escenas[0].voz,
		);
		expect(screen.getByText("Revisa los datos no publicados.")).toBeVisible();
		expect(screen.queryByText(/Guiones guardados|Revisar guion/)).toBeNull();
		expect(
			screen.queryByRole("button", {
				name: /Guardar como borrador|Aprobar|Generar prompt|Generar guion/i,
			}),
		).toBeNull();
		const copiar = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal(
			"navigator",
			Object.create(navigator, { clipboard: { value: { writeText: copiar } } }),
		);
		const boton = await screen.findByRole("button", {
			name: "Copiar respuesta completa",
		});
		fireEvent.click(boton);
		expect(await screen.findByText("Respuesta copiada.")).toBeVisible();
		expect(copiar).toHaveBeenCalledWith(
			expect.stringContaining("Antojo Fresura"),
		);
		expect(copiar).toHaveBeenCalledWith(
			expect.stringContaining(tarjeta.guion.escenas[0].voz),
		);
		expect(copiar).toHaveBeenCalledWith(
			expect.stringContaining(tarjeta.guion.notas_produccion),
		);
		const escrituras = simulado.fetchSimulado.mock.calls
			.filter(([, opciones]) => opciones?.method && opciones.method !== "GET")
			.map(
				([url, opciones]) =>
					`${opciones?.method} ${new URL(String(url)).pathname}`,
			);
		expect(escrituras).toEqual([
			"POST /rest/v1/agente_conversaciones",
			"POST /functions/v1/ia/chat",
		]);
	});
	it("RF-18: guardar el guion es una acción explícita y aprobar ocurre en la biblioteca", async () => {
		const simulado = simular();
		simulado.responder(() => respuesta({ tarjetaGuion: tarjeta }));
		enviar();
		expect(
			await screen.findByRole("heading", { name: tarjeta.guion.titulo }),
		).toBeVisible();
		await screen.findByRole("button", { name: "Copiar respuesta completa" });
		for (const rol of ["button", "link", "menuitem"]) {
			expect(
				screen.queryAllByRole(rol, { name: /aprobar|descartar|publicar/i }),
			).toHaveLength(0);
		}
		expect(simulado.guardados).toEqual([]);
		fireEvent.click(
			screen.getByRole("button", { name: "Guardar en biblioteca" }),
		);
		expect(
			await screen.findByRole("button", { name: "Guardado en la biblioteca" }),
		).toBeDisabled();
		expect(simulado.guardados).toEqual([
			{
				tipo: "guion",
				titulo: tarjeta.guion.titulo,
				red: "instagram",
				contenido: tarjeta,
				conversacion_id: id,
			},
		]);
	});
	it("permite copiar un prompt escrito en el chat aunque el navegador bloquee el portapapeles", async () => {
		const simulado = simular();
		const prompt =
			"Video vertical 9:16\nEscena 1: plano medio\nVoz: Conoce Fresura";
		simulado.responder(() =>
			flujo([
				{ type: "start", messageId: "prompt" },
				{ type: "text-start", id: "texto" },
				{ type: "text-delta", id: "texto", delta: prompt },
				{ type: "text-end", id: "texto" },
				{ type: "finish", finishReason: "stop" },
			]),
		);
		const copiar = vi.fn().mockRejectedValue(new Error("Permiso denegado"));
		vi.stubGlobal(
			"navigator",
			Object.create(navigator, { clipboard: { value: { writeText: copiar } } }),
		);
		enviar("Dame las indicaciones para Dreamina");
		fireEvent.click(
			await screen.findByRole("button", { name: "Copiar respuesta completa" }),
		);
		const campo = await screen.findByRole("textbox", {
			name: "Texto completo para copiar",
		});
		expect(copiar).toHaveBeenCalledWith(prompt);
		expect(campo).toHaveValue(prompt);
		expect(campo).toHaveFocus();
		expect(campo).toHaveProperty("selectionEnd", prompt.length);
	});
	it("ofrece opciones de bienvenida y permite responder con un número por el mismo chat", async () => {
		const simulado = simular();
		expect(screen.getByText(/¿Qué creamos hoy\?/)).toHaveTextContent(
			"3. Carrusel para Instagram o Facebook",
		);
		simulado.responder(() =>
			flujo([
				{ type: "start", messageId: "eleccion" },
				{ type: "text-start", id: "opciones" },
				{
					type: "text-delta",
					id: "opciones",
					delta: "¿Qué sede? 1. U Nacional 2. U Javeriana",
				},
				{ type: "text-end", id: "opciones" },
				{ type: "finish", finishReason: "stop" },
			]),
		);
		enviar("2");
		expect(await screen.findByText(/¿Qué sede/)).toBeVisible();
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Nueva conversación" }),
			).toBeEnabled(),
		);
		simulado.responder(() => respuesta());
		enviar("1");
		await screen.findByText("Vamos a preparar tu guion");
		expect(simulado.peticiones.map((p) => p.cuerpo)).toEqual([
			{ conversacion_id: id, mensaje: "2" },
			{ conversacion_id: id, mensaje: "1" },
		]);
	});
	it("muestra el mensaje JSON de un 503 y permite reintentar", async () => {
		const simulado = simular();
		simulado.responder(() =>
			Response.json(
				{
					error: "ia_tiempo",
					mensaje:
						"No se pudo generar el guion. Inténtalo de nuevo en unos minutos.",
				},
				{ status: 503 },
			),
		);
		enviar();
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Inténtalo de nuevo en unos minutos",
		);
		expect(
			screen.getByRole("button", { name: "Intentar de nuevo" }),
		).toBeEnabled();
		simulado.responder(() => respuesta());
		fireEvent.click(screen.getByRole("button", { name: "Intentar de nuevo" }));
		expect(
			await screen.findByText("Vamos a preparar tu guion"),
		).toBeInTheDocument();
		expect(simulado.peticiones).toHaveLength(2);
	});
	it.each([
		["cupo agotado", "Se alcanzó el límite de hoy. Inténtalo mañana."],
		[
			"503 del proveedor",
			"No se pudo generar el guion. Inténtalo de nuevo en unos minutos.",
		],
	])(
		"muestra el error del flujo SSE por %s y reintenta el mismo mensaje",
		async (_, mensaje) => {
			const simulado = simular();
			simulado.responder(() =>
				flujo([
					{ type: "start", messageId: "fallo-agente" },
					{ type: "error", errorText: mensaje },
				]),
			);
			enviar();
			expect(await screen.findByRole("alert")).toHaveTextContent(mensaje);
			const reintentar = screen.getByRole("button", {
				name: "Intentar de nuevo",
			});
			await waitFor(() => expect(reintentar).toBeEnabled());
			expect(simulado.peticiones).toHaveLength(1);

			simulado.responder(() => respuesta());
			fireEvent.click(reintentar);
			expect(
				await screen.findByText("Vamos a preparar tu guion"),
			).toBeVisible();
			expect(screen.queryByRole("alert")).not.toBeInTheDocument();
			expect(simulado.peticiones.map((peticion) => peticion.cuerpo)).toEqual([
				{ conversacion_id: id, mensaje: "Quiero un guion" },
				{ conversacion_id: id, mensaje: "Quiero un guion" },
			]);
		},
	);
	it("borrar exige confirmación dentro de la interfaz y permite cancelarla", async () => {
		const simulado = simular(true);
		const confirmar = vi.spyOn(window, "confirm");
		fireEvent.click(
			await screen.findByRole("button", { name: "Borrar Quiero un guion" }),
		);
		expect(screen.getByText(/¿Borrar esta conversación/)).toBeInTheDocument();
		expect(
			simulado.fetchSimulado.mock.calls.some(
				([, opciones]) => opciones?.method === "DELETE",
			),
		).toBe(false);
		fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		expect(
			screen.queryByRole("button", { name: "Confirmar borrado" }),
		).not.toBeInTheDocument();
		fireEvent.click(
			screen.getByRole("button", { name: "Borrar Quiero un guion" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Confirmar borrado" }));
		await waitFor(() =>
			expect(
				screen.queryByRole("button", { name: "Borrar Quiero un guion" }),
			).not.toBeInTheDocument(),
		);
		expect(confirmar).not.toHaveBeenCalled();
	});
	it("avisa cuando termina sin texto ni tarjeta", async () => {
		const simulado = simular();
		simulado.responder(() =>
			flujo([
				{ type: "start", messageId: "sin-texto" },
				{ type: "finish", finishReason: "tool-calls" },
			]),
		);
		enviar();
		expect(
			await screen.findByText(/El agente no pudo completar la respuesta/),
		).toBeInTheDocument();
	});
});
