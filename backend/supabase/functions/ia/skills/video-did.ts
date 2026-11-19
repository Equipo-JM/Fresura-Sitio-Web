import type { SupabaseClient } from "@supabase/supabase-js";
import type { ModelMessage } from "ai";
import { z } from "zod";
import {
	AVISO_VIDEO_EN_CURSO,
	BOTONES_VIDEO,
	ENLACE_VIDEO_DID,
	esquemaEstadoVideo,
	pulsarBotonVideo,
} from "../../_shared/esquemas/chat.ts";
import {
	crearEsquemaGuion,
	esquemaInstruccionGuion,
} from "../../_shared/esquemas/guion.ts";
import {
	leerCuerpoJson,
	responderCuerpoInvalido,
	responderError,
	responderJson,
} from "../../_shared/http.ts";
import type { ManejadorRuta } from "../../_shared/servidor.ts";
import { guardarMensajes, leerConversacion } from "../agente/memoria.ts";
import type { crearProveedorDid, EstiloVideo } from "../proveedor/did.ts";

/** Dependencias privadas. El navegador nunca recibe la configuración de D-ID. */
export type VideoDid = {
	cliente: () => SupabaseClient;
	proveedor: ReturnType<typeof crearProveedorDid>;
};

const acciones = {
	[BOTONES_VIDEO.preparar.orden]: "preparar",
	[BOTONES_VIDEO.confirmar.orden]: "confirmar",
	[BOTONES_VIDEO.consultar.orden]: "consultar",
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
	guion_llamada: z.string(),
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

type InstruccionEntregada = z.infer<typeof esquemaInstruccionGuion>;

/**
 * Fondo y expresión según la instrucción del guion. Usa el fondo que eligió el
 * agente; si no eligió (guiones anteriores), la cafetería, que sirve casi
 * siempre. Promociones y lanzamientos usan la expresión animada si está configurada.
 */
export function estiloVideo(instruccion: InstruccionEntregada): EstiloVideo {
	return {
		fondo: instruccion.fondo ?? "cafeteria",
		animado:
			instruccion.objetivo === "promocion" ||
			instruccion.objetivo === "lanzamiento",
	};
}

/** Guiones válidos entregados en la conversación, por id de llamada y en orden. */
function guionesEntregados(historial: ModelMessage[]) {
	const llamadas = new Map<string, unknown>();
	const entregas = new Map<
		string,
		{ id: string; voz: string; instruccion: InstruccionEntregada }
	>();
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
				entregas.set(parte.toolCallId, {
					id: parte.toolCallId,
					instruccion: entrada.data.instruccion,
					voz: guion.data.escenas
						.map((e) => e.voz.trim())
						.filter(Boolean)
						.join("\n\n"),
				});
		}
	}
	return entregas;
}

function ultimoGuion(historial: ModelMessage[]) {
	return [...guionesEntregados(historial).values()].at(-1);
}

const COLUMNAS = "id,guion_llamada,voz,estado,did_id,did_recurso,confirmado_en";
const CONFIRMAR = `D-ID puede consumir créditos de tu cupo al renderizar el diálogo del guion con Presentadora Fresura. ${pulsarBotonVideo("confirmar")}`;
const INCIERTO =
	"No pude confirmar si D-ID recibió el video. Revisa tus creaciones en D-ID antes de volver a solicitarlo.";
const ESTADOS: Record<Trabajo["estado"], string> = {
	pendiente: CONFIRMAR,
	enviando: `Estoy enviando el video a D-ID. ${AVISO_VIDEO_EN_CURSO}`,
	enviado: `El video ya se envió a D-ID. ${AVISO_VIDEO_EN_CURSO}`,
	rechazado: `D-ID rechazó el envío. Revisa la configuración o el cupo antes de otro intento. ${pulsarBotonVideo("preparar")}`,
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

const SIN_SOLICITUD = `Todavía no hay una solicitud en esta conversación. ${pulsarBotonVideo("preparar")}`;

/** Resultado de consultar un video: `preparando` es el único estado que pide volver a consultar. */
export type EstadoVideo = {
	estado: "preparando" | "listo" | "detenido";
	mensaje: string;
};

async function leerUltimoTrabajo(video: VideoDid, conversacionId: string) {
	const { data, error } = await video
		.cliente()
		.from("agente_videos")
		.select(COLUMNAS)
		.eq("conversacion_id", conversacionId)
		.order("creado_en", { ascending: false })
		.order("id", { ascending: false })
		.limit(1)
		.maybeSingle();
	if (error) throw new Error("video_did_lectura");
	return leerTrabajo(data);
}

async function consultarTrabajo(
	actual: Trabajo,
	video: VideoDid,
): Promise<EstadoVideo> {
	if (!actual.did_id || !actual.did_recurso) {
		const mensaje = describirTrabajo(actual);
		// Solo un envío reciente sigue en curso; pendiente espera la confirmación
		// de la persona y los demás estados ya no cambian solos.
		return {
			estado: mensaje === ESTADOS.enviando ? "preparando" : "detenido",
			mensaje,
		};
	}
	const consulta = await video.proveedor.consultar(
		actual.did_recurso,
		actual.did_id,
	);
	// Un fallo al consultar no afecta el render: se vuelve a intentar.
	if (!consulta)
		return {
			estado: "preparando",
			mensaje: `No pude consultar D-ID en este momento. ${AVISO_VIDEO_EN_CURSO}`,
		};
	if (consulta.status === "done" && consulta.result_url)
		return {
			estado: "listo",
			mensaje: `${ENLACE_VIDEO_DID}\n${consulta.result_url}`,
		};
	if (["error", "failed", "rejected"].includes(consulta.status))
		return {
			estado: "detenido",
			mensaje:
				"D-ID informó un error de renderizado. Revisa el trabajo en tu cuenta antes de pedir otro video.",
		};
	return {
		estado: "preparando",
		mensaje: `D-ID todavía está preparando el video. ${AVISO_VIDEO_EN_CURSO}`,
	};
}

/** Consulta el último video de la conversación sin escribir en ella. */
export async function consultarVideoDid(
	conversacionId: string,
	video?: VideoDid,
): Promise<EstadoVideo> {
	if (!video)
		return {
			estado: "detenido",
			mensaje: "D-ID todavía no está configurado para Fresura.",
		};
	const actual = await leerUltimoTrabajo(video, conversacionId);
	if (!actual) return { estado: "detenido", mensaje: SIN_SOLICITUD };
	return consultarTrabajo(actual, video);
}

/**
 * POST /estado-video: el panel lo llama solo mientras un video está en curso.
 * Con `listo` o `detenido` guarda el mensaje final en la conversación, para que
 * el historial muestre el resultado y el panel deje de consultar al recargar.
 */
export function crearRutaEstadoVideo(opciones: {
	crearCliente: (jwt: string) => SupabaseClient;
	videoDid?: VideoDid;
}): ManejadorRuta {
	return async ({ peticion, jwt, cors }) => {
		const cuerpo = await leerCuerpoJson(peticion);
		if (!cuerpo.valido) return responderCuerpoInvalido(cuerpo.motivo, cors);
		const entrada = esquemaEstadoVideo.safeParse(cuerpo.datos);
		if (!entrada.success)
			return responderError(
				400,
				"datos_no_validos",
				"No se pudo consultar el video.",
				cors,
			);
		const id = entrada.data.conversacion_id;
		const cliente = opciones.crearCliente(jwt);
		// La tabla de videos se lee con la clave secreta: el acceso a la
		// conversación se comprueba antes con RLS y el JWT del administrador.
		if (!(await leerConversacion(cliente, id)))
			return responderError(
				404,
				"conversacion_no_encontrada",
				"Esa conversación no existe.",
				cors,
			);
		const resultado = await consultarVideoDid(id, opciones.videoDid);
		if (resultado.estado !== "preparando")
			await guardarMensajes(cliente, id, [
				{ role: "assistant", content: resultado.mensaje },
			]);
		return responderJson(200, resultado, cors);
	};
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
			return "Pídeme un guion con diálogo en esta conversación y luego pulsa «Crear video» en su tarjeta.";
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
			return `No pude recuperar la solicitud. ${pulsarBotonVideo("preparar")}`;
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
			: `La solicitud cambió. ${pulsarBotonVideo("consultar")}`;
	}
	const actual = await leerUltimoTrabajo(video, conversacionId);
	if (!actual) return SIN_SOLICITUD;
	if (accion === "consultar")
		return (await consultarTrabajo(actual, video)).mensaje;
	if (actual.estado !== "pendiente") return describirTrabajo(actual);
	const reservado = await tabla()
		.update({ estado: "enviando", confirmado_en: new Date().toISOString() })
		.eq("id", actual.id)
		.eq("estado", "pendiente")
		.select("id")
		.maybeSingle();
	if (reservado.error) throw new Error("video_did_confirmacion");
	if (!reservado.data)
		return `Esta solicitud ya fue atendida. ${pulsarBotonVideo("consultar")}`;
	const entregado = guionesEntregados(historial).get(actual.guion_llamada);
	const envio = await video.proveedor.generar(
		actual.voz,
		entregado ? estiloVideo(entregado.instruccion) : undefined,
	);
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
	return envio.tipo === "rechazado"
		? `${envio.mensaje} ${pulsarBotonVideo("preparar")}`
		: ESTADOS[envio.tipo];
}
