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
