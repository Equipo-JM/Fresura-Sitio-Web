import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
	AVISO_VIDEO_EN_CURSO,
	ENLACE_VIDEO_DID,
} from "../../supabase/functions/_shared/esquemas/chat";
import { crearProveedorDid } from "../../supabase/functions/ia/proveedor/did";
import {
	consultarVideoDid,
	crearRutaEstadoVideo,
} from "../../supabase/functions/ia/skills/video-did";

const id = "12345678-1234-4234-8234-123456789abc";
const opcionesAuth = { persistSession: false, autoRefreshToken: false };

type Fila = {
	id: string;
	voz: string;
	estado: string;
	did_id: string | null;
	did_recurso: string | null;
	confirmado_en: string | null;
};

const enviado: Fila = {
	id: "trabajo-1",
	voz: "Hola",
	estado: "enviado",
	did_id: "tlk-ficticio",
	did_recurso: "talks",
	confirmado_en: new Date().toISOString(),
};

/** D-ID simulado: `respuesta` es lo que devuelve la consulta del render. */
function preparar(fila: Fila | null, respuesta?: Response) {
	const cliente = createClient("https://supabase.invalid", "ficticia", {
		auth: opcionesAuth,
		global: { fetch: async () => Response.json(fila ? [fila] : []) },
	});
	const pedir = vi.fn<typeof fetch>(async () =>
		(respuesta ?? Response.json({ status: "started" })).clone(),
	);
	const proveedor = crearProveedorDid({
		clave: "ficticia:demo",
		perfil: {
			tipo: "foto",
			imagen: "https://fresura.example/avatar.jpg",
			voz: "voz-ficticia",
		},
		pedir,
	});
	return { video: { cliente: () => cliente, proveedor }, pedir };
}

/** Cliente con RLS simulado: guarda los mensajes que la ruta escribe. */
function clienteConversacion(visible = true) {
	const escritos: unknown[] = [];
	const cliente = createClient("https://supabase.invalid", "ficticia", {
		auth: opcionesAuth,
		global: {
			fetch: async (url, opciones) => {
				if (String(url).includes("agente_mensajes")) {
					escritos.push(...JSON.parse(String(opciones?.body)));
					return new Response(null, { status: 201 });
				}
				return Response.json(visible ? [{ id, titulo: "Guion" }] : []);
			},
		},
	});
	return { cliente, escritos };
}

function peticion(cuerpo: unknown) {
	return new Request("https://funcion.invalid/ia/estado-video", {
		method: "POST",
		body: JSON.stringify(cuerpo),
	});
}

describe("consulta automática del video de D-ID", () => {
	it("sigue consultando mientras D-ID prepara o no responde", async () => {
		expect(await consultarVideoDid(id, preparar(enviado).video)).toMatchObject({
			estado: "preparando",
		});
		const caido = preparar(enviado, new Response(null, { status: 503 }));
		const resultado = await consultarVideoDid(id, caido.video);
		expect(resultado.estado).toBe("preparando");
		expect(resultado.mensaje).toContain(AVISO_VIDEO_EN_CURSO);
		const enviando = { ...enviado, estado: "enviando", did_id: null };
		expect(
			await consultarVideoDid(
				id,
				preparar({ ...enviando, did_recurso: null }).video,
			),
		).toMatchObject({ estado: "preparando" });
	});

	it("entrega el enlace cuando D-ID termina", async () => {
		const { video } = preparar(
			enviado,
			Response.json({
				status: "done",
				result_url: "https://result.d-id.com/demo.mp4",
			}),
		);
		expect(await consultarVideoDid(id, video)).toEqual({
			estado: "listo",
			mensaje: `${ENLACE_VIDEO_DID}\nhttps://result.d-id.com/demo.mp4`,
		});
	});

	it("se detiene sin configuración, sin solicitud, sin confirmar o con un error del render", async () => {
		expect((await consultarVideoDid(id)).estado).toBe("detenido");
		const sinFila = preparar(null);
		expect(await consultarVideoDid(id, sinFila.video)).toMatchObject({
			estado: "detenido",
		});
		expect(sinFila.pedir).not.toHaveBeenCalled();
		const pendiente = {
			...enviado,
			estado: "pendiente",
			did_id: null,
			did_recurso: null,
			confirmado_en: null,
		};
		expect(
			(await consultarVideoDid(id, preparar(pendiente).video)).estado,
		).toBe("detenido");
		const viejo = {
			...pendiente,
			estado: "enviando",
			confirmado_en: new Date(Date.now() - 60_000).toISOString(),
		};
		expect((await consultarVideoDid(id, preparar(viejo).video)).estado).toBe(
			"detenido",
		);
		const fallido = preparar(enviado, Response.json({ status: "error" }));
		expect((await consultarVideoDid(id, fallido.video)).estado).toBe(
			"detenido",
		);
	});
});

describe("POST /estado-video", () => {
	const contexto = { jwt: "jwt", usuario: "admin", cors: {} };

	it("guarda solo el mensaje final en la conversación", async () => {
		const { cliente, escritos } = clienteConversacion();
		const listo = preparar(
			enviado,
			Response.json({
				status: "done",
				result_url: "https://result.d-id.com/demo.mp4",
			}),
		);
		const ruta = crearRutaEstadoVideo({
			crearCliente: () => cliente,
			videoDid: listo.video,
		});
		const respuesta = await ruta({
			...contexto,
			peticion: peticion({ conversacion_id: id }),
		});
		expect(respuesta.status).toBe(200);
		expect(await respuesta.json()).toMatchObject({ estado: "listo" });
		expect(escritos).toMatchObject([
			{
				conversacion_id: id,
				rol: "agente",
				contenido: { role: "assistant" },
			},
		]);

		const enCurso = crearRutaEstadoVideo({
			crearCliente: () => cliente,
			videoDid: preparar(enviado).video,
		});
		await enCurso({ ...contexto, peticion: peticion({ conversacion_id: id }) });
		expect(escritos).toHaveLength(1);
	});

	it("oculta conversaciones ajenas y rechaza cuerpos inválidos", async () => {
		const { video, pedir } = preparar(enviado);
		const oculta = crearRutaEstadoVideo({
			crearCliente: () => clienteConversacion(false).cliente,
			videoDid: video,
		});
		expect(
			(
				await oculta({
					...contexto,
					peticion: peticion({ conversacion_id: id }),
				})
			).status,
		).toBe(404);
		expect(
			(
				await oculta({
					...contexto,
					peticion: peticion({ conversacion_id: "x" }),
				})
			).status,
		).toBe(400);
		expect(pedir).not.toHaveBeenCalled();
	});
});
