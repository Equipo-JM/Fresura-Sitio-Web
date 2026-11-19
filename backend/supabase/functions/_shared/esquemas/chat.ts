import { z } from "zod";

/** Contrato compartido del último mensaje; el historial se carga exclusivamente en el servidor. */
export const esquemaChat = z.strictObject({
	conversacion_id: z.uuid(),
	mensaje: z.string().trim().min(1).max(2000),
});

/** Opciones de bienvenida, compartidas para que el agente pueda interpretar una respuesta numérica. */
export const INICIO_CHAT = `¡Hola! Soy tu asistente de redes y contenido de Fresura. ¿Qué creamos hoy?
1. Video para redes (guion y pieza para Dreamina: con la presentadora o solo escenas)
2. Publicación con texto y hashtags
3. Carrusel para Instagram o Facebook
4. Prompt para fotos con IA (Gemini)
5. Ideas o calendario de publicaciones
6. Revisar un texto antes de publicarlo

Responde con un número o cuéntame tu idea.`;

const TITULOS_OPCIONES: Readonly<Record<string, string>> = {
	"1": "Video para redes",
	"2": "Publicación para redes",
	"3": "Carrusel",
	"4": "Fotos con IA",
	"5": "Ideas y calendario",
	"6": "Revisión antes de publicar",
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
