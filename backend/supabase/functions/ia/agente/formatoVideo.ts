import type { ModelMessage } from "ai";
import {
	type FormatoDreamina,
	PREGUNTA_FORMATO,
} from "../../_shared/dreamina.ts";
import {
	leerTarjeta,
	type TarjetaGuion,
} from "../../_shared/esquemas/guion.ts";

export { PREGUNTA_FORMATO };

function eleccion(
	texto: string,
	enPregunta: boolean,
): FormatoDreamina | undefined {
	if (
		/[?¿]/.test(texto) ||
		/\b(?:no se si|con o sin|si o no|1 o 2)\b/.test(texto)
	)
		return;
	if (enPregunta) {
		if (/^(?:opcion\s+|la\s+)?1\b|^si[.! ]*$/.test(texto))
			return "con presentadora";
		if (/^(?:opcion\s+|la\s+)?2\b|^no[.! ]*$/.test(texto))
			return "solo escenas";
		if (/^(?:opcion\s+|la\s+)?3\b|^(?:ambas|ambos|mixto)\b/.test(texto))
			return "mixto";
	}
	if (
		/\b(?:sin (?:la |una )?(?:presentadora|personas?)|solo (?:escenas|producto|el producto|tomas)|no (?:quiero (?:que (?:salga|aparezca) )?|incluir |usar )(?:a )?(?:la |una )?presentadora)\b/.test(
			texto,
		)
	)
		return "solo escenas";
	if (
		/\b(?:alternar|intercalar|combinar)\b.*(?:presentadora|@fresura)|presentadora y (?:las )?(?:escenas|tomas|producto)/.test(
			texto,
		)
	)
		return "mixto";
	if (
		/\bcon (?:la |una )?presentadora\b|(?:quiero|incluye|usa) (?:a )?(?:la )?(?:presentadora|@fresura)\b/.test(
			texto,
		) ||
		(enPregunta && /^(?:la presentadora|presentadora|@fresura)\b/.test(texto))
	)
		return "con presentadora";
}

/** Solo las decisiones de la persona habilitan la entrega. Un guion no elige el formato. */
export function turnoVideo(mensajes: readonly ModelMessage[]) {
	let formato: FormatoDreamina | undefined;
	let pregunta = false;
	let guion: TarjetaGuion | undefined;
	let convertir = false;
	const llamadasGuion = new Map<string, TarjetaGuion>();
	let video = false;
	let generar = false;
	let primerMensaje = true;
	for (const mensaje of mensajes) {
		if (mensaje.role === "system") continue;
		if (mensaje.role === "tool") {
			for (const parte of mensaje.content) {
				if (
					parte.type === "tool-result" &&
					parte.toolName === "entregar_guion" &&
					parte.output.type === "json" &&
					typeof parte.output.value === "object" &&
					parte.output.value !== null &&
					"ok" in parte.output.value &&
					parte.output.value.ok === true
				) {
					guion = llamadasGuion.get(parte.toolCallId);
					convertir = false;
				}
			}
			if (
				mensaje.content.some(
					(p) =>
						p.type === "tool-result" &&
						p.toolName === "entregar_pieza" &&
						p.output.type === "json" &&
						typeof p.output.value === "object" &&
						p.output.value !== null &&
						"ok" in p.output.value &&
						p.output.value.ok === true,
				)
			)
				generar = false;
			continue;
		}
		const contenido =
			typeof mensaje.content === "string"
				? mensaje.content
				: mensaje.content
						.flatMap((p) => (p.type === "text" ? [p.text] : []))
						.join("\n");
		if (mensaje.role === "assistant") {
			if (typeof mensaje.content !== "string") {
				for (const parte of mensaje.content) {
					if (parte.type !== "tool-call" || parte.toolName !== "entregar_guion")
						continue;
					video = true;
					const tarjeta = leerTarjeta(parte.input);
					if (tarjeta) llamadasGuion.set(parte.toolCallId, tarjeta);
				}
			}
			if (contenido.trim()) pregunta = contenido.includes(PREGUNTA_FORMATO);
			continue;
		}
		const texto = contenido
			.toLowerCase()
			.normalize("NFD")
			.replace(/\p{M}/gu, "")
			.trim();
		const otraPieza =
			/\b(?:carrusel|gemini|canva|calendario|publicacion|prompts? (?:para |de )?(?:una? )?(?:foto|imagen))\b/.test(
				texto,
			);
		const pidePrompt = /\b(?:prompts?|dreamina|seedance|clips?)\b/.test(texto);
		const soloGuion =
			(!pidePrompt && /\bguion(?:es)?\b/.test(texto)) ||
			/\b(?:solo (?:el |un )?guion|sin (?:los )?prompts?)\b/.test(texto);
		const nuevo =
			/\b(?:haz(?:me)?|crea(?:me)?|genera(?:me)?|quiero|necesito) (?:un |el )?(?:video|reel)\b|\b(?:otro|nuevo|nueva) (?:video|reel|campana)\b|\b(?:video|reel) nuevo\b/.test(
				texto,
			);
		const mencionaVideo =
			/\b(?:video|reel|dreamina|seedance|clips?|guion)\b/.test(texto);
		const consulta =
			/^(?:¿?c[oó]mo (?:se |funciona|uso|abro)|¿?qu[eé] es |(?:hola|gracias|listo)[.! ]*$)/.test(
				texto,
			);
		if (nuevo || otraPieza) {
			formato = undefined;
			guion = undefined;
		}
		video =
			!otraPieza &&
			(video || pregunta || mencionaVideo || (primerMensaje && texto === "1"));
		// El contenido de un guion pegado puede mencionar a la presentadora sin pedirla.
		const [peticion] = texto.split(/(?:guion|escena \d+|que se ve)\s*:/);
		const opcion = eleccion(peticion, pregunta);
		if (video && opcion) formato = opcion;
		// Solo convertir literalmente si se pidió usar el guion tal cual. Los ajustes creativos siguen en el agente.
		const convertirTalCual =
			/^(?:(?:quiero|vamos a|puedes) )?(?:(?:hacerlo|hacer este video|usarlo|pasarlo|convertirlo|prepararlo|llevarlo) (?:en|a|para) |(?:dame |genera |generame |prepara )?(?:los? |el )?prompts? (?:de |para )?|(?:en|para) )?(?:dreamina|seedance)[.! ]*$/.test(
				texto,
			);
		const soloEleccion =
			/^(?:(?:la |opcion )?[123]|si|no|(?:con |sin )?(?:la )?presentadora(?: en camara)?|solo escenas(?:, sin personas)?|alternar (?:la )?presentadora y escenas(?: del producto)?|ambas|ambos|mixto)[.! ]*$/.test(
				texto,
			);
		convertir = Boolean(
			guion && (convertirTalCual || (convertir && soloEleccion)),
		);
		if (soloGuion || !video || consulta) generar = false;
		else if (
			mencionaVideo ||
			pregunta ||
			(primerMensaje && texto === "1") ||
			/\bprompts?\b/.test(texto)
		)
			generar = true;
		pregunta = false;
		primerMensaje = false;
	}
	return { formato, generar, guionParaDreamina: convertir ? guion : undefined };
}
