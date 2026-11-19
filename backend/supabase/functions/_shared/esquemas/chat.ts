import { z } from "zod";

/** Contrato compartido del último mensaje; el historial se carga exclusivamente en el servidor. */
export const esquemaChat = z.strictObject({
	conversacion_id: z.uuid(),
	mensaje: z.string().trim().min(1).max(2000),
});

/** Opciones de bienvenida, compartidas para que el agente pueda interpretar una respuesta numérica. */
export const INICIO_CHAT = `¿Qué quieres mostrar en el video?
1. Un producto
2. Una sede
3. Una temporada o campaña
4. La marca Fresura

Responde con un número o cuéntame tu idea.`;

const TITULOS_OPCIONES: Readonly<Record<string, string>> = {
	"1": "Guion de producto",
	"2": "Guion sobre una sede",
	"3": "Guion de temporada o campaña",
	"4": "Guion sobre la marca Fresura",
};

/** Indica si un primer mensaje todavía no describe un tema. */
export function esTituloProvisional(mensaje: string): boolean {
	return /^(?:\d+|hola|sí|si|no|ok|dale|listo|gracias)[.!?)]*$/iu.test(
		mensaje.trim(),
	);
}

/** Resume un tema en una línea y convierte las respuestas cortas en títulos legibles. */
export function tituloConversacion(mensaje: string): string {
	const texto = mensaje.trim().replace(/\s+/g, " ");
	if (!texto || esTituloProvisional(texto))
		return (
			TITULOS_OPCIONES[texto.replace(/[.)]$/, "")] ?? "Conversación de Fresura"
		);
	if (texto.length <= 60) return texto;
	const corte = texto.lastIndexOf(" ", 60);
	return texto.slice(0, corte > 0 ? corte : 60);
}
