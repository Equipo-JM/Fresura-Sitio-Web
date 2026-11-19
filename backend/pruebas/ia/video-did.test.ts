import { createClient } from "@supabase/supabase-js";
import type { ModelMessage } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import { ENLACE_VIDEO_DID } from "../../supabase/functions/_shared/esquemas/chat";
import {
	crearProveedorDid,
	type PerfilDid,
} from "../../supabase/functions/ia/proveedor/did";
import { crearRutaChat } from "../../supabase/functions/ia/skills/chat";
import {
	accionVideoDid,
	procesarVideoDid,
} from "../../supabase/functions/ia/skills/video-did";
import { guionDePrueba } from "../datos/guion";

const id = "12345678-1234-4234-8234-123456789abc";
const guion = guionDePrueba();
function entrega(llamada = "guion-1"): ModelMessage[] {
	return [
		{
			role: "assistant",
			content: [
				{
					type: "tool-call",
					toolCallId: llamada,
					toolName: "entregar_guion",
					input: {
						instruccion: {
							producto_id: null,
							campana: null,
							objetivo: "dar_a_conocer",
							tono: "cercano",
							red: "tiktok",
							duracion_s: 15,
						},
						guion,
					},
				},
			],
		},
		{
			role: "tool",
			content: [
				{
					type: "tool-result",
					toolCallId: llamada,
					toolName: "entregar_guion",
					output: { type: "json", value: { ok: true } },
				},
			],
		},
	];
}

type TrabajoSimulado = {
	id: string;
	conversacion_id: string;
	guion_llamada: string;
	voz: string;
	estado: string;
	did_id: string | null;
	did_recurso: string | null;
	confirmado_en: string | null;
};

function preparar(
	perfil: PerfilDid = {
		tipo: "foto",
		imagen: "https://fresura.example/avatar.jpg",
		voz: "voz-ficticia",
	},
) {
	const trabajos: TrabajoSimulado[] = [];
	const mensajes = entrega().map((contenido) => ({ contenido }));
	const reservas: { conflicto: string | null; preferencia: string | null }[] =
		[];
	const reclamos: string[] = [];
	const cliente = createClient("https://supabase.invalid", "ficticia", {
		auth: { persistSession: false, autoRefreshToken: false },
		global: {
			fetch: async (url, opciones) => {
				const { pathname, searchParams: filtros } = new URL(String(url));
				if (pathname === "/rest/v1/agente_conversaciones")
					return Response.json({ id, titulo: "Fresura" });
				if (pathname === "/rest/v1/agente_mensajes") {
					if (opciones?.method === "POST") {
						const nuevos = JSON.parse(String(opciones.body)) as typeof mensajes;
						mensajes.push(...nuevos);
						return new Response(null, { status: 201 });
					}
					return Response.json([...mensajes].reverse());
				}
				if (pathname !== "/rest/v1/agente_videos")
					throw new Error(`Petición inesperada: ${pathname}`);
				if (opciones?.method === "POST") {
					const entrada = JSON.parse(String(opciones.body)) as Pick<
						TrabajoSimulado,
						"conversacion_id" | "guion_llamada" | "voz"
					>;
					reservas.push({
						conflicto: filtros.get("on_conflict"),
						preferencia: new Headers(opciones.headers).get("Prefer"),
					});
					if (
						!trabajos.some(
							(fila) =>
								fila.conversacion_id === entrada.conversacion_id &&
								fila.guion_llamada === entrada.guion_llamada,
						)
					)
						trabajos.push({
							...entrada,
							id: `trabajo-${trabajos.length + 1}`,
							estado: "pendiente",
							did_id: null,
							did_recurso: null,
							confirmado_en: null,
						});
					return new Response(null, { status: 201 });
				}
				if (opciones?.method === "PATCH") {
					const fila = trabajos.find(
						(fila) =>
							filtros.get("id") === `eq.${fila.id}` &&
							filtros.get("estado") === `eq.${fila.estado}`,
					);
					if (!fila) return Response.json([]);
					const cambios = JSON.parse(
						String(opciones.body),
					) as Partial<TrabajoSimulado>;
					if (cambios.estado === "enviando") reclamos.push(fila.guion_llamada);
					Object.assign(fila, cambios);
					return Response.json([fila]);
				}
				const llamada = filtros.get("guion_llamada");
				const filas = trabajos.filter(
					(fila) =>
						filtros.get("conversacion_id") === `eq.${fila.conversacion_id}` &&
						(llamada === null || llamada === `eq.${fila.guion_llamada}`),
				);
				return Response.json(
					filtros.get("limit") === "1" ? filas.slice(-1) : filas,
				);
			},
		},
	});
	const pedir = vi.fn<typeof fetch>();
	pedir.mockImplementation(async (_url, opciones) =>
		opciones?.method === "POST"
			? Response.json({ id: "tlk-ficticio" }, { status: 201 })
			: Response.json({
					status: "done",
					result_url: "https://result.d-id.com/demo.mp4",
				}),
	);
	const proveedor = crearProveedorDid({
		clave: "ficticia:demo",
		perfil,
		pedir,
	});
	const video = { cliente: () => cliente, proveedor };
	return {
		cliente,
		video,
		pedir,
		reservas,
		reclamos,
		procesar: (
			accion: "preparar" | "confirmar" | "consultar",
			historial = entrega(),
		) => procesarVideoDid(accion, id, historial, video),
	};
}

describe("video de Fresura con D-ID", () => {
	it("reconoce órdenes explícitas y no trata un «sí» ni una frase negativa como autorización", () => {
		expect(accionVideoDid("¿Estado del vídeo?")).toBe("consultar");
		expect(accionVideoDid("Confirmar video.")).toBe("confirmar");
		expect(accionVideoDid("sí")).toBeUndefined();
		expect(accionVideoDid("no confirmar video")).toBeUndefined();
	});
	it("reserva, exige confirmación, deduplica dos envíos y recupera el enlace", async () => {
		const { procesar, pedir, reclamos } = preparar();
		expect(await procesar("confirmar")).toContain("Todavía no hay");
		expect(await procesar("preparar")).toContain("confirmar video");
		expect(pedir).not.toHaveBeenCalled();
		await Promise.all([procesar("confirmar"), procesar("confirmar")]);
		expect(reclamos).toEqual(["guion-1"]);
		expect(pedir).toHaveBeenCalledTimes(1);
		const [url, opciones] = pedir.mock.calls[0];
		expect(url).toBe("https://api.d-id.com/talks");
		expect(new Headers(opciones?.headers).get("Authorization")).toBe(
			"Basic ficticia:demo",
		);
		expect(JSON.parse(String(opciones?.body))).toEqual({
			name: "Presentadora Fresura",
			source_url: "https://fresura.example/avatar.jpg",
			script: {
				type: "text",
				input: guion.escenas
					.map((e) => e.voz)
					.filter(Boolean)
					.join("\n\n"),
				provider: { type: "microsoft", voice_id: "voz-ficticia" },
			},
		});
		expect(await procesar("consultar")).toContain(
			"https://result.d-id.com/demo.mp4",
		);
		expect(pedir.mock.calls[1][0]).toBe(
			"https://api.d-id.com/talks/tlk-ficticio",
		);
	});
	it("reutiliza la reserva por entrega y permite reclamar una nueva una sola vez", async () => {
		const { procesar, pedir, reclamos, reservas } = preparar();
		await procesar("preparar");
		await procesar("confirmar");
		expect(await procesar("preparar")).toContain("ya se envió");
		await procesar("confirmar");
		expect(pedir).toHaveBeenCalledTimes(1);

		expect(await procesar("preparar", entrega("guion-2"))).toContain("cupo");
		await Promise.all([procesar("confirmar"), procesar("confirmar")]);
		expect(pedir).toHaveBeenCalledTimes(2);
		expect(reclamos).toEqual(["guion-1", "guion-2"]);
		expect(reservas).toEqual(
			Array(3).fill({
				conflicto: "conversacion_id,guion_llamada",
				preferencia: expect.stringContaining("resolution=ignore-duplicates"),
			}),
		);
	});
	it("procesa desde el chat el aviso de cupo, la confirmación explícita y el enlace", async () => {
		const { cliente, video, pedir } = preparar();
		const crearModelo = vi.fn(() => new MockLanguageModelV3());
		const ruta = crearRutaChat({
			crearCliente: () => cliente,
			claveGemini: "ficticia",
			modeloAgente: "principal",
			modeloRespaldo: "respaldo",
			crearModelo,
			videoDid: video,
		});
		async function enviar(mensaje: string) {
			const respuesta = await ruta({
				peticion: new Request("https://local/ia/chat", {
					method: "POST",
					body: JSON.stringify({ conversacion_id: id, mensaje }),
				}),
				jwt: "ficticio",
				usuario: id,
				cors: {},
			});
			expect(respuesta.status).toBe(200);
			expect(respuesta.headers.get("content-type")).toContain(
				"text/event-stream",
			);
			return respuesta.text();
		}

		const aviso = await enviar("crear video");
		expect(aviso).toContain("créditos de tu cupo");
		expect(aviso).toContain("confirmar video");
		expect(await enviar("estado del video")).toContain("confirmar video");
		expect(pedir).not.toHaveBeenCalled();

		expect(await enviar("confirmar video")).toContain("ya se envió a D-ID");
		expect(pedir).toHaveBeenCalledExactlyOnceWith(
			"https://api.d-id.com/talks",
			expect.objectContaining({ method: "POST" }),
		);
		expect(await enviar("estado del video")).toContain(
			JSON.stringify(`${ENLACE_VIDEO_DID}\nhttps://result.d-id.com/demo.mp4`),
		);
		expect(pedir).toHaveBeenCalledTimes(2);
		expect(crearModelo).not.toHaveBeenCalled();
	});
	it("envía el fondo de marca solo si está configurado en el perfil Expressive", async () => {
		const pedir = vi.fn<typeof fetch>(async () =>
			Response.json({ id: "exp_ficticio" }, { status: 201 }),
		);
		const perfil = {
			tipo: "expresivo" as const,
			avatar: "avatar@de-prueba",
			sentimiento: "snt_ficticio",
			voz: "voz-ficticia",
			modeloVoz: "eleven_flash_v2_5",
		};
		const fondo = "https://fresura.example/marca/fondo-presentadora.png";
		await crearProveedorDid({
			clave: "c",
			perfil: { ...perfil, fondo },
			pedir,
		}).generar("Hola");
		await crearProveedorDid({ clave: "c", perfil, pedir }).generar("Hola");
		const cuerpos = pedir.mock.calls.map(([, o]) =>
			JSON.parse(String(o?.body)),
		);
		expect(cuerpos[0].background).toEqual({ type: "image_url", value: fondo });
		expect(cuerpos[1]).not.toHaveProperty("background");
	});
	it("conserva avatar, sentimiento y voz privada en Expressive y consulta ese mismo recurso", async () => {
		const { procesar, pedir } = preparar({
			tipo: "expresivo",
			avatar: "avatar@de-prueba",
			sentimiento: "snt_ficticio",
			voz: "voz-privada-ficticia",
			modeloVoz: "eleven_flash_v2_5",
		});
		pedir.mockResolvedValueOnce(
			Response.json({ id: "exp_ficticio" }, { status: 201 }),
		);
		await procesar("preparar");
		await procesar("confirmar");
		const [url, opciones] = pedir.mock.calls[0];
		expect(url).toBe("https://api.d-id.com/expressives");
		expect(JSON.parse(String(opciones?.body))).toMatchObject({
			avatar_id: "avatar@de-prueba",
			sentiment_id: "snt_ficticio",
			script: {
				provider: {
					type: "elevenlabs",
					voice_id: "voz-privada-ficticia",
					model_id: "eleven_flash_v2_5",
				},
			},
		});
		expect(await procesar("consultar")).toContain(
			"https://result.d-id.com/demo.mp4",
		);
		expect(pedir.mock.calls[1][0]).toBe(
			"https://api.d-id.com/expressives/exp_ficticio",
		);
	});
	it.each([
		["fallo de red", () => Promise.reject(new Error("fallo de red"))],
		["503 de D-ID", async () => new Response(null, { status: 503 })],
		["201 sin identificador", async () => Response.json({}, { status: 201 })],
	])(
		"un %s deja el envío indeterminado y bloquea el reenvío",
		async (_, fallo) => {
			const { procesar, pedir } = preparar();
			pedir.mockImplementationOnce(fallo);
			await procesar("preparar");
			expect(await procesar("confirmar")).toContain("No pude confirmar");
			expect(await procesar("consultar")).toContain("No pude confirmar");
			expect(await procesar("preparar")).toContain("No pude confirmar");
			expect(await procesar("confirmar")).toContain("No pude confirmar");
			expect(pedir).toHaveBeenCalledTimes(1);
		},
	);
	it("permite rearmar un rechazo definitivo de créditos con una nueva confirmación", async () => {
		const { procesar, pedir } = preparar();
		pedir.mockResolvedValueOnce(new Response(null, { status: 402 }));
		await procesar("preparar");
		expect(await procesar("confirmar")).toContain("falta de créditos");
		await procesar("confirmar");
		expect(pedir).toHaveBeenCalledTimes(1);
		expect(await procesar("preparar")).toContain("confirmar video");
		expect(await procesar("confirmar")).toContain("ya se envió");
		expect(pedir).toHaveBeenCalledTimes(2);
	});
	it("el endpoint de chat responde sin llamar a Gemini cuando D-ID no está configurado", async () => {
		const guardados: unknown[] = [];
		const cliente = createClient("https://supabase.invalid", "ficticia", {
			auth: { persistSession: false, autoRefreshToken: false },
			global: {
				fetch: async (_url, opciones) => {
					if (opciones?.method === "POST") {
						guardados.push(...JSON.parse(String(opciones.body)));
						return new Response(null, { status: 201 });
					}
					return Response.json({ id, titulo: "Fresura" });
				},
			},
		});
		const crearModelo = vi.fn(() => new MockLanguageModelV3());
		const ruta = crearRutaChat({
			crearCliente: () => cliente,
			claveGemini: "ficticia",
			modeloAgente: "simulado",
			modeloRespaldo: "simulado",
			crearModelo,
		});
		const respuesta = await ruta({
			peticion: new Request("https://local/chat", {
				method: "POST",
				body: JSON.stringify({ conversacion_id: id, mensaje: "crear video" }),
			}),
			jwt: "ficticio",
			usuario: id,
			cors: {},
		});
		expect(await respuesta.text()).toContain("todavía no está configurado");
		expect(crearModelo).not.toHaveBeenCalled();
		expect(guardados).toHaveLength(2);
	});
});
