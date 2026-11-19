import type { SupabaseClient } from "@supabase/supabase-js";
import type { ModelMessage } from "ai";
import { z } from "zod";
import { ENLACE_VIDEO_DID } from "../../_shared/esquemas/chat.ts";
import {
	crearEsquemaGuion,
	esquemaInstruccionGuion,
} from "../../_shared/esquemas/guion.ts";
import type { crearProveedorDid } from "../proveedor/did.ts";

/** Dependencias privadas. El navegador nunca recibe la configuración de D-ID. */
export type VideoDid = {
	cliente: () => SupabaseClient;
	proveedor: ReturnType<typeof crearProveedorDid>;
};

const acciones = {
	"crear video": "preparar",
	"confirmar video": "confirmar",
	"estado del video": "consultar",
} as const;

type Accion = (typeof acciones)[keyof typeof acciones];

/** Solo una instrucción explícita del administrador activa el flujo de video. */
export function accionVideoDid(mensaje: string): Accion | undefined {
	const orden = mensaje
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.replace(/[¿?!.]/g, "")
		.trim()
		.replace(/\s+/g, " ");
	return Object.hasOwn(acciones, orden)
		? acciones[orden as keyof typeof acciones]
		: undefined;
}

const trabajo = z.object({
	id: z.string(),
	voz: z.string(),
	estado: z.enum([
		"pendiente",
		"enviando",
		"enviado",
		"rechazado",
		"indeterminado",
	]),
	did_id: z.string().nullable(),
	did_recurso: z.enum(["talks", "expressives"]).nullable(),
	confirmado_en: z.string().nullable(),
});

type Trabajo = z.infer<typeof trabajo>;

function leerTrabajo(data: unknown): Trabajo | null {
	if (!data) return null;
	const valido = trabajo.safeParse(data);
	if (!valido.success) throw new Error("video_did_datos_invalidos");
	return valido.data;
}

const entradaGuion = z.object({
	instruccion: esquemaInstruccionGuion,
	guion: z.unknown(),
});
const entregaValida = z.object({ ok: z.literal(true) });

function ultimoGuion(historial: ModelMessage[]) {
	const llamadas = new Map<string, unknown>();
	let entrega: { id: string; voz: string } | undefined;
	for (const mensaje of historial) {
		if (mensaje.role === "assistant" && Array.isArray(mensaje.content)) {
			for (const parte of mensaje.content)
				if (parte.type === "tool-call" && parte.toolName === "entregar_guion")
					llamadas.set(parte.toolCallId, parte.input);
		}
		if (mensaje.role !== "tool") continue;
		for (const parte of mensaje.content) {
			if (
				parte.type !== "tool-result" ||
				parte.toolName !== "entregar_guion" ||
				parte.output.type !== "json" ||
				!entregaValida.safeParse(parte.output.value).success
			)
				continue;
			const entrada = entradaGuion.safeParse(llamadas.get(parte.toolCallId));
			if (!entrada.success) continue;
			const guion = crearEsquemaGuion(
				entrada.data.instruccion.duracion_s,
			).safeParse(entrada.data.guion);
			if (guion.success)
				entrega = {
					id: parte.toolCallId,
					voz: guion.data.escenas
						.map((e) => e.voz.trim())
						.filter(Boolean)
						.join("\n\n"),
				};
		}
	}
	return entrega;
}

const COLUMNAS = "id,voz,estado,did_id,did_recurso,confirmado_en";
const CONFIRMAR =
	"D-ID puede consumir créditos de tu cupo al renderizar con Presentadora Fresura. Escribe «confirmar video» para enviar el diálogo del guion.";
const INCIERTO =
	"No pude confirmar si D-ID recibió el video. Revisa tus creaciones en D-ID antes de volver a solicitarlo.";
const ESTADOS: Record<Trabajo["estado"], string> = {
	pendiente: CONFIRMAR,
	enviando:
		"Estoy enviando el video a D-ID. Escribe «estado del video» para consultar.",
	enviado:
		"El video ya se envió a D-ID. Escribe «estado del video» para consultar.",
	rechazado:
		"D-ID rechazó el envío. Tras revisar la configuración o el cupo, escribe «crear video» para preparar otro intento.",
	indeterminado: INCIERTO,
};

function describirTrabajo(trabajo: Trabajo): string {
	if (
		trabajo.estado === "enviando" &&
		trabajo.confirmado_en &&
		Date.now() - Date.parse(trabajo.confirmado_en) > 30_000
	)
		return INCIERTO;
	return ESTADOS[trabajo.estado];
}

/** Ejecuta la acción del chat después de validar sesión y acceso a la conversación. */
export async function procesarVideoDid(
	accion: Accion,
	conversacionId: string,
	historial: ModelMessage[],
	video?: VideoDid,
): Promise<string> {
	if (!video)
		return "D-ID todavía no está configurado para Fresura. Puedes seguir preparando el guion en este chat.";
	const cliente = video.cliente();
	const tabla = () => cliente.from("agente_videos");
	if (accion === "preparar") {
		const guion = ultimoGuion(historial);
		if (!guion?.voz)
			return "Pídeme un guion con diálogo en esta conversación y luego escribe «crear video».";
		const { error } = await tabla().upsert(
			{
				conversacion_id: conversacionId,
				guion_llamada: guion.id,
				voz: guion.voz,
			},
			{ onConflict: "conversacion_id,guion_llamada", ignoreDuplicates: true },
		);
		if (error) throw new Error("video_did_reserva");
		const { data, error: lectura } = await tabla()
			.select(COLUMNAS)
			.eq("conversacion_id", conversacionId)
			.eq("guion_llamada", guion.id)
			.maybeSingle();
		if (lectura) throw new Error("video_did_lectura");
		const actual = leerTrabajo(data);
		if (!actual)
			return "No pude recuperar la solicitud. Vuelve a escribir «crear video».";
		if (actual.estado !== "rechazado") return describirTrabajo(actual);
		const reinicio = await tabla()
			.update({ estado: "pendiente" })
			.eq("id", actual.id)
			.eq("estado", "rechazado")
			.select("id")
			.maybeSingle();
		if (reinicio.error) throw new Error("video_did_reintento");
		return reinicio.data
			? CONFIRMAR
			: "La solicitud cambió. Escribe «estado del video».";
	}
	const { data, error } = await tabla()
		.select(COLUMNAS)
		.eq("conversacion_id", conversacionId)
		.order("creado_en", { ascending: false })
		.order("id", { ascending: false })
		.limit(1)
		.maybeSingle();
	if (error) throw new Error("video_did_lectura");
	const actual = leerTrabajo(data);
	if (!actual)
		return "Todavía no hay una solicitud en esta conversación. Escribe «crear video» para empezar.";
	if (accion === "consultar") {
		if (!actual.did_id || !actual.did_recurso) return describirTrabajo(actual);
		const consulta = await video.proveedor.consultar(
			actual.did_recurso,
			actual.did_id,
		);
		if (!consulta)
			return "No pude consultar D-ID. Vuelve a escribir «estado del video» en un momento.";
		if (consulta.status === "done" && consulta.result_url)
			return `${ENLACE_VIDEO_DID}\n${consulta.result_url}`;
		if (["error", "failed", "rejected"].includes(consulta.status))
			return "D-ID informó un error de renderizado. Revisa el trabajo en tu cuenta antes de pedir otro video.";
		return "D-ID todavía está preparando el video. Escribe «estado del video» en un momento.";
	}
	if (actual.estado !== "pendiente") return describirTrabajo(actual);
	const reservado = await tabla()
		.update({ estado: "enviando", confirmado_en: new Date().toISOString() })
		.eq("id", actual.id)
		.eq("estado", "pendiente")
		.select("id")
		.maybeSingle();
	if (reservado.error) throw new Error("video_did_confirmacion");
	if (!reservado.data)
		return "Esta solicitud ya fue atendida. Escribe «estado del video».";
	const envio = await video.proveedor.generar(actual.voz);
	const resultado = await tabla()
		.update({
			estado: envio.tipo,
			did_id: envio.tipo === "enviado" ? envio.id : null,
			did_recurso: envio.tipo === "enviado" ? envio.recurso : null,
		})
		.eq("id", actual.id)
		.eq("estado", "enviando")
		.select("id")
		.maybeSingle();
	if (resultado.error || !resultado.data) return INCIERTO;
	return envio.tipo === "rechazado" ? envio.mensaje : ESTADOS[envio.tipo];
}
