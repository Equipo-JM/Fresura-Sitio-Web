import { z } from "zod";

/** Contrato compartido del último mensaje; el historial se carga exclusivamente en el servidor. */
export const esquemaChat = z.strictObject({
	conversacion_id: z.uuid(),
	mensaje: z.string().trim().min(1).max(2000),
});
