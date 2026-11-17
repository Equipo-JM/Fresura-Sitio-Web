import type { SupabaseClient } from "@supabase/supabase-js";
import { type ModelMessage, modelMessageSchema } from "ai";

/** Lee con RLS: una conversación oculta se trata igual que una inexistente. */
export async function leerConversacion(cliente: SupabaseClient, id: string) {
	const { data, error } = await cliente
		.from("agente_conversaciones")
		.select("id")
		.eq("id", id)
		.maybeSingle();
	if (error) throw new Error("lectura_conversacion");
	return data;
}

/** Reconstruye mensajes completos del SDK, preservando llamadas y resultados de herramientas. */
export function reconstruirMensajes(
	filas: readonly { contenido: unknown }[],
): ModelMessage[] {
	return filas.map((fila) => modelMessageSchema.parse(fila.contenido));
}

/** Carga en orden cronológico; las escrituras asignan fechas distintas dentro de cada turno. */
export async function cargarMensajes(
	cliente: SupabaseClient,
	id: string,
): Promise<ModelMessage[]> {
	const { data, error } = await cliente
		.from("agente_mensajes")
		.select("contenido")
		.eq("conversacion_id", id)
		.order("creado_en", { ascending: true });
	if (error) throw new Error("lectura_mensajes");
	return reconstruirMensajes(data ?? []);
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

/** Solo acredita fichas cuyo resultado exitoso corresponde a una llamada ver_producto del historial. */
export function productosConsultadosEnHistorial(
	mensajes: readonly ModelMessage[],
): Set<string> {
	const llamadas = new Map<string, string>();
	const productos = new Set<string>();
	for (const mensaje of mensajes) {
		if (typeof mensaje.content === "string") continue;
		for (const parte of mensaje.content) {
			if (
				parte.type === "tool-call" &&
				parte.toolName === "ver_producto" &&
				typeof parte.input === "object" &&
				parte.input !== null &&
				"producto_id" in parte.input &&
				typeof parte.input.producto_id === "string"
			)
				llamadas.set(parte.toolCallId, parte.input.producto_id);
			if (
				parte.type === "tool-result" &&
				parte.toolName === "ver_producto" &&
				parte.output.type === "json"
			) {
				const valor = parte.output.value;
				const producto = llamadas.get(parte.toolCallId);
				if (
					producto &&
					typeof valor === "object" &&
					valor !== null &&
					!Array.isArray(valor) &&
					!("error" in valor)
				)
					productos.add(producto);
			}
		}
	}
	return productos;
}
