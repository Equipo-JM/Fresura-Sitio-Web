import { z } from "zod";

/** Contrato compartido del último mensaje; el historial se carga exclusivamente en el servidor. */
export const esquemaChat = z.strictObject({
	conversacion_id: z.uuid(),
	mensaje: z.string().trim().min(1).max(2000),
});

/** Opciones de bienvenida, compartidas para que el agente pueda interpretar una respuesta numérica. */
export const INICIO_CHAT = `¡Hola! Soy tu asistente de redes y contenido de Fresura. ¿Qué creamos hoy?
1. Guion de video (por escenas o con la presentadora en cámara)
2. Publicación con texto y hashtags
3. Carrusel para Instagram o Facebook
4. Prompt para fotos con IA (Gemini)
5. Prompts de clips cortos (Google Vids)
6. Prompt de video por escenas (HeyGen)
7. Ideas o calendario de publicaciones
8. Revisar un texto antes de publicarlo

Responde con un número o cuéntame tu idea.`;

const TITULOS_OPCIONES: Readonly<Record<string, string>> = {
	"1": "Guion de video",
	"2": "Publicación para redes",
	"3": "Carrusel",
	"4": "Fotos con IA",
	"5": "Clips cortos",
	"6": "Video por escenas",
	"7": "Ideas y calendario",
	"8": "Revisión antes de publicar",
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

/** Texto que precede al enlace temporal devuelto por D-ID. */
export const ENLACE_VIDEO_DID =
	"Tu video de Presentadora Fresura está listo. Este enlace es temporal:";

/**
 * Cierre de los mensajes de un video en curso. El panel lo busca al final de la
 * última respuesta para consultar el estado por su cuenta, sin que la persona escriba.
 */
export const AVISO_VIDEO_EN_CURSO =
	"Te muestro el enlace aquí cuando esté listo.";

/** Petición de `POST /estado-video`: consulta el último video de la conversación. */
export const esquemaEstadoVideo = z.strictObject({
	conversacion_id: z.uuid(),
});

/**
 * Respuesta de `POST /estado-video`. `preparando` pide volver a consultar; con
 * `listo` o `detenido` el servidor ya guardó `mensaje` en la conversación.
 */
export const esquemaRespuestaEstadoVideo = z.object({
	estado: z.enum(["preparando", "listo", "detenido"]),
	mensaje: z.string(),
});
