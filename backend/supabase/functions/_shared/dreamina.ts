import type { Guion, TarjetaGuion } from "./esquemas/guion.ts";
import {
	CONTINUIDAD_CLIP_SEEDANCE,
	MAXIMO_DURACION_SEEDANCE,
	PERSONAJE_DREAMINA,
	type Pieza,
	VOZ_PRESENTADORA_SEEDANCE,
} from "./esquemas/pieza.ts";

/** Las opciones numeradas forman parte del historial y permiten retomar la decisión. */
export const PREGUNTA_FORMATO =
	"¿Cómo quieres el video? 1. Con la presentadora (@fresura) en cámara. 2. Solo escenas, sin personas. 3. Alternar la presentadora y escenas del producto.";

/** Opciones comunes al chat y a la conversión directa de un guion guardado. */
export const FORMATOS_DREAMINA = {
	"con presentadora": "Con la presentadora en cámara",
	"solo escenas": "Solo escenas, sin personas",
	mixto: "Alternar presentadora y escenas",
} as const;

/** Elección explícita de la persona para este guion. */
export type FormatoDreamina = keyof typeof FORMATOS_DREAMINA;
type Escena = Guion["escenas"][number];

function promptClip(tomas: Escena[], formato: FormatoDreamina, guion: Guion) {
	const inicio = tomas[0].inicio_s;
	const duracion = tomas[tomas.length - 1].fin_s - inicio;
	const conPersona = formato !== "solo escenas";
	return [
		conPersona &&
			`${PERSONAJE_DREAMINA} es la presentadora de Fresura en este video; conserva su cara, cabello y ropa en todas las escenas donde aparece.`,
		`Duración del clip: ${duracion} segundos.`,
		`Video vertical 9:16 para Fresura. Tema: ${guion.titulo}. Luz cálida y paleta rosa, crema y beige.`,
		formato === "mixto"
			? "Alterna la presentadora en cámara con planos detalle del producto; su voz continúa fuera de plano durante esos cortes."
			: conPersona
				? "Muestra a la presentadora en cámara junto al producto."
				: "Filma únicamente el producto, las manos o el lugar, sin personas reconocibles.",
		...tomas.map((toma) => {
			const visual =
				!conPersona &&
				/presentadora|@fresura|\b(?:ella|modelo|chica|mujer)\b/i.test(
					toma.que_se_ve,
				)
					? `Reencuadra esta acción en el producto o el entorno. Mantén a la persona fuera de plano: ${toma.que_se_ve.replace(/@fresura|presentadora/gi, "modelo")}`
					: toma.que_se_ve.replace(/@fresura/gi, "la presentadora");
			return [
				`${toma.inicio_s - inicio}–${toma.fin_s - inicio} s. ${visual}`,
				toma.texto_pantalla && `Texto en pantalla: «${toma.texto_pantalla}».`,
				toma.voz &&
					`${conPersona ? "La presentadora dice" : "Voz en off"}: «${toma.voz}».`,
			]
				.filter(Boolean)
				.join(" ");
		}),
		`Música: ${guion.musica_sugerida}`,
		conPersona && tomas.some((t) => t.voz) && VOZ_PRESENTADORA_SEEDANCE,
		CONTINUIDAD_CLIP_SEEDANCE,
	]
		.filter(Boolean)
		.join("\n");
}

/** Convierte el guion validado en prompts independientes, también con escenas antiguas de más de 15 s. */
export function piezasDesdeGuion(
	{ guion, instruccion }: TarjetaGuion,
	formato: FormatoDreamina,
): Pieza[] {
	const clips: Escena[][] = [];
	for (const escena of guion.escenas) {
		let vozPendiente = escena.voz;
		for (let inicio = escena.inicio_s; inicio < escena.fin_s; ) {
			const fin = Math.min(inicio + MAXIMO_DURACION_SEEDANCE, escena.fin_s);
			let voz = vozPendiente;
			if (fin < escena.fin_s && voz.length > MAXIMO_DURACION_SEEDANCE * 16) {
				const cabe = voz.slice(0, MAXIMO_DURACION_SEEDANCE * 16);
				const frase = [...cabe.matchAll(/[.!?…](?=\s|$)/g)].at(-1);
				const corte = frase ? frase.index + 1 : cabe.lastIndexOf(" ");
				if (corte > 0) voz = voz.slice(0, corte);
			}
			vozPendiente = vozPendiente.slice(voz.length).trimStart();
			const toma = { ...escena, inicio_s: inicio, fin_s: fin, voz };
			const anterior = clips.at(-1);
			if (
				anterior &&
				fin - anterior[0].inicio_s <= MAXIMO_DURACION_SEEDANCE &&
				promptClip([...anterior, toma], formato, guion).length <= 2200
			)
				anterior.push(toma);
			else clips.push([toma]);
			inicio = fin;
		}
	}
	return clips.map((tomas, i) => ({
		tipo: "prompt_seedance",
		titulo: `Clip ${i + 1} de ${clips.length} · ${tomas[0].inicio_s}–${tomas[tomas.length - 1].fin_s} s`,
		red: instruccion.red,
		bloques: [
			{ etiqueta: "Prompt", texto: promptClip(tomas, formato, guion) },
			{
				etiqueta: "Cómo usar",
				texto: `Pega el prompt en AI Video de Dreamina. Elige Seedance, formato 9:16 y la duración indicada.${formato === "solo escenas" ? "" : " Vuelve a escribir @ al inicio y selecciona el personaje fresura."}`,
			},
		],
	}));
}
