import { createClient } from "@supabase/supabase-js";
import type { ModelMessage } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
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
const historial: ModelMessage[] = [
	{
		role: "assistant",
		content: [
			{
				type: "tool-call",
				toolCallId: "guion-1",
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
				toolCallId: "guion-1",
				toolName: "entregar_guion",
				output: { type: "json", value: { ok: true } },
			},
		],
	},
];

function preparar(
	perfil: PerfilDid = {
		tipo: "foto",
		imagen: "https://fresura.example/avatar.jpg",
		voz: "voz-ficticia",
	},
) {
	let fila: Record<string, string | null> | null = null;
	const cliente = createClient("https://supabase.invalid", "ficticia", {
		auth: { persistSession: false, autoRefreshToken: false },
		global: {
			fetch: async (url, opciones) => {
				const filtros = new URL(String(url)).searchParams;
				if (opciones?.method === "POST") {
					if (!fila)
						fila = {
							...JSON.parse(String(opciones.body)),
							id: "trabajo-1",
							estado: "pendiente",
							did_id: null,
							did_recurso: null,
							confirmado_en: null,
						};
					return new Response(null, { status: 201 });
				}
				if (opciones?.method === "PATCH") {
					if (
						!fila ||
						filtros.get("id") !== `eq.${fila.id}` ||
						filtros.get("estado") !== `eq.${fila.estado}`
					)
						return Response.json([]);
					fila = { ...fila, ...JSON.parse(String(opciones.body)) };
				}
				return Response.json(fila ? [fila] : []);
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
		video,
		pedir,
		procesar: (accion: "preparar" | "confirmar" | "consultar") =>
			procesarVideoDid(accion, id, historial, video),
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
		const { procesar, pedir } = preparar();
		expect(await procesar("confirmar")).toContain("Todavía no hay");
		expect(await procesar("preparar")).toContain("confirmar video");
		expect(pedir).not.toHaveBeenCalled();
		await Promise.all([procesar("confirmar"), procesar("confirmar")]);
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
	it("un fallo de red no repite una solicitud que ya pudo haber llegado al proveedor", async () => {
		const { procesar, pedir } = preparar();
		pedir.mockRejectedValueOnce(new Error("fallo de red"));
		await procesar("preparar");
		expect(await procesar("confirmar")).toContain("No pude confirmar");
		expect(await procesar("confirmar")).toContain("No pude confirmar");
		expect(await procesar("preparar")).toContain("No pude confirmar");
		expect(pedir).toHaveBeenCalledTimes(1);
	});
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
