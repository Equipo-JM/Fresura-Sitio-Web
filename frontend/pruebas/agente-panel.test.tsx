import { createClient } from "@supabase/supabase-js";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { createUIMessageStreamResponse, type UIMessageChunk } from "ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatAgente } from "../src/panel/agente/ChatAgente";
import {
	convertirHistorial,
	tituloConversacion,
} from "../src/panel/agente/servicioConversaciones";
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
function simular(iniciales = false) {
	let filas = iniciales ? [conversacion] : [];
	const guardados: unknown[] = [];
	let token = "token-inicial-ficticio";
	let responder = () => respuesta();
	const peticiones: { cuerpo: unknown; autorizacion: string | null }[] = [];
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
			const cuerpo = opciones?.body
				? JSON.parse(String(opciones.body))
				: undefined;
			if (url.includes("agente_conversaciones")) {
				if (opciones?.method === "POST") {
					filas = [conversacion];
					return Response.json(conversacion);
				}
				if (opciones?.method === "DELETE") {
					filas = [];
					return new Response(null, { status: 204 });
				}
				return Response.json(filas);
			}
			if (url.includes("agente_mensajes")) return Response.json([]);
			if (url.includes("guiones") && opciones?.method === "POST") {
				guardados.push(cuerpo);
				return Response.json({
					...cuerpo,
					id: "borrador",
					creado_en: conversacion.actualizado_en,
					actualizado_en: conversacion.actualizado_en,
					creado_por: "admin",
				});
			}
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
	const abrir = vi.fn();
	render(
		<div className="panel guiones-panel">
			<ChatAgente
				cliente={cliente}
				abrirGuion={abrir}
				productos={[{ id: "fresas", nombre: "Fresas" }]}
			/>
		</div>,
	);
	return {
		peticiones,
		abrir,
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
afterEach(() => vi.restoreAllMocks());
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

	it("muestra tarjeta, aviso y guarda mediante el servicio de guiones para abrir el editor", async () => {
		const simulado = simular();
		simulado.responder(() =>
			respuesta({
				tarjetaGuion: tarjeta,
				aviso: {
					tipo: "precio_no_publicado",
					mensaje: "Revisa los datos no publicados.",
				},
			}),
		);
		enviar();
		expect(
			await screen.findByRole("heading", { name: "Antojo Fresura" }),
		).toBeInTheDocument();
		expect(
			screen.getByText("Revisa los datos no publicados."),
		).toBeInTheDocument();
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Guardar como borrador" }),
			).toBeEnabled(),
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Guardar como borrador" }),
		);
		expect(
			await screen.findByText("Guardado como borrador"),
		).toBeInTheDocument();
		expect(simulado.guardados).toEqual([
			{
				instruccion: { ...tarjeta.instruccion, producto_nombre: "Fresas" },
				generado: tarjeta.guion,
				editado: tarjeta.guion,
				estado: "borrador",
			},
		]);
		expect(simulado.abrir).toHaveBeenCalledWith(
			expect.objectContaining({ id: "borrador", estado: "borrador" }),
		);
	});
	it("guarda como borrador un guion general sin asociar un producto", async () => {
		const simulado = simular();
		const general = {
			...tarjeta,
			instruccion: { ...tarjeta.instruccion, producto_id: null },
		};
		simulado.responder(() => respuesta({ tarjetaGuion: general }));
		enviar();
		const guardar = await screen.findByRole("button", {
			name: "Guardar como borrador",
		});
		await waitFor(() => expect(guardar).toBeEnabled());
		expect(simulado.guardados).toHaveLength(0);
		fireEvent.click(guardar);
		await screen.findByText("Guardado como borrador");
		expect(simulado.guardados).toEqual([
			expect.objectContaining({
				instruccion: {
					...general.instruccion,
					producto_nombre: "Guion general",
				},
				estado: "borrador",
			}),
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
