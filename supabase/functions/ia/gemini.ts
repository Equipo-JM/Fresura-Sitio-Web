import { FinishReason, GoogleGenAI } from "@google/genai";
import type { LlamarModelo } from "./generar.ts";

/**
 * Llamada a Gemini con salida estructurada (DT-01, IF-11). La clave llega desde
 * los secretos de la función y nunca sale del servidor (RNF-07).
 */

// Motivos de fin que indican que el proveedor bloqueó el contenido.
const MOTIVOS_DE_BLOQUEO = new Set<string>([
	FinishReason.SAFETY,
	FinishReason.PROHIBITED_CONTENT,
	FinishReason.BLOCKLIST,
	FinishReason.SPII,
]);

/** Crea la función que llama a Gemini con la clave dada. */
export function crearLlamadaGemini(clave: string): LlamarModelo {
	const cliente = new GoogleGenAI({ apiKey: clave });

	return async ({ modelo, prompt, esquemaJson, senal }) => {
		const respuesta = await cliente.models.generateContent({
			model: modelo,
			contents: prompt.usuario,
			config: {
				systemInstruction: prompt.sistema,
				responseMimeType: "application/json",
				responseJsonSchema: esquemaJson,
				abortSignal: senal,
			},
		});

		const motivo = respuesta.candidates?.[0]?.finishReason;
		const bloqueado =
			respuesta.promptFeedback?.blockReason !== undefined ||
			(motivo !== undefined && MOTIVOS_DE_BLOQUEO.has(motivo));

		return { texto: bloqueado ? undefined : respuesta.text, bloqueado };
	};
}
