import { z } from "zod";

/**
 * Referencia de estilo: una publicación reciente de Fresura que el agente lee
 * para imitar su tono y formato. Comparten este contrato el formulario del
 * panel y la herramienta `ver_estilo_redes`.
 */
export const esquemaReferenciaEstilo = z.strictObject({
	red: z.enum(["instagram", "tiktok", "facebook"]),
	formato: z.enum(["video", "carrusel", "foto", "historia"]),
	enlace: z
		.url({ protocol: /^https$/ })
		.max(500)
		.nullable(),
	texto: z.string().trim().min(1).max(3000),
	publicada_en: z.iso.date().nullable(),
});

/** Referencia validada. */
export type ReferenciaEstilo = z.infer<typeof esquemaReferenciaEstilo>;

/** Cuántas referencias recientes lee el agente en cada turno. */
export const MAXIMO_REFERENCIAS_AGENTE = 12;
