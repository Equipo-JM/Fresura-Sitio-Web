import type { SupabaseClient } from "@supabase/supabase-js";
import { type ModelMessage, modelMessageSchema } from "ai";

/** Lee con RLS: una conversación oculta se trata igual que una inexistente. */
export async function leerConversacion(cliente: SupabaseClient, id: string) {
	const { data, error } = await cliente
		.from("agente_conversaciones")
		.select("id,titulo")
		.eq("id", id)
		.maybeSingle();
	if (error) throw new Error("lectura_conversacion");
	return data;
}

/**
 * Reconstruye mensajes completos del SDK, preservando llamadas y resultados de
 * herramientas. Descarta, sin romper la conversación, las filas que no son un
 * mensaje válido, los mensajes `system` (las instrucciones solo las pone el
 * servidor) y los resultados de herramienta sin una llamada previa del agente:
 * una fila así bloqueaba el chat entero (revisión de seguridad del 17 nov).
 */
export function reconstruirMensajes(
	filas: readonly { contenido: unknown }[],
): ModelMessage[] {
	const llamadas = new Set<string>();
	const mensajes: ModelMessage[] = [];
	for (const fila of filas) {
		const leido = modelMessageSchema.safeParse(fila.contenido);
		if (!leido.success || leido.data.role === "system") continue;
		const mensaje = leido.data;
		if (mensaje.role === "assistant" && typeof mensaje.content !== "string")
			for (const parte of mensaje.content)
				if (parte.type === "tool-call") llamadas.add(parte.toolCallId);
		if (
			mensaje.role === "tool" &&
			!mensaje.content.every(
				(parte) =>
					parte.type !== "tool-result" || llamadas.has(parte.toolCallId),
			)
		)
			continue;
		mensajes.push(mensaje);
	}
	return mensajes;
}

const MAXIMO_FILAS_CONTEXTO = 40;

/** Carga los turnos recientes completos, sin cambiar lo que se guarda en la base. */
export async function cargarMensajes(
	cliente: SupabaseClient,
	id: string,
): Promise<ModelMessage[]> {
	const { data, error } = await cliente
		.from("agente_mensajes")
		.select("contenido")
		.eq("conversacion_id", id)
		.order("creado_en", { ascending: false })
		.limit(MAXIMO_FILAS_CONTEXTO + 1);
	if (error) throw new Error("lectura_mensajes");
	const filas = data ?? [];
	const mensajes = reconstruirMensajes(
		filas.slice(0, MAXIMO_FILAS_CONTEXTO).reverse(),
	);
	if (filas.length <= MAXIMO_FILAS_CONTEXTO) return mensajes;
	const primerTurno = mensajes.findIndex((mensaje) => mensaje.role === "user");
	return primerTurno < 0 ? [] : mensajes.slice(primerTurno);
}

/** Serializa sin perder la estructura del SDK; nunca admite instrucciones system en la memoria. */
export function filasDeMensajes(
	id: string,
	mensajes: readonly ModelMessage[],
	inicio = new Date(),
) {
	return mensajes.map((mensaje, indice) => {
		if (mensaje.role === "system") throw new Error("rol_memoria_no_valido");
		return {
			conversacion_id: id,
			rol:
				mensaje.role === "user"
					? "administrador"
					: mensaje.role === "assistant"
						? "agente"
						: "herramienta",
			contenido: mensaje,
			creado_en: new Date(inicio.getTime() + indice).toISOString(),
		};
	});
}

/** Guarda un bloque completo y propaga fallos con un tipo seguro para el registro. */
export async function guardarMensajes(
	cliente: SupabaseClient,
	id: string,
	mensajes: readonly ModelMessage[],
) {
	if (!mensajes.length) return;
	const { error } = await cliente
		.from("agente_mensajes")
		.insert(filasDeMensajes(id, mensajes));
	if (error) throw new Error("escritura_mensajes");
}
