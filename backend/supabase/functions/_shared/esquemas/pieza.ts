import { z } from "zod";

/**
 * Piezas de contenido que el agente entrega en el chat además del guion:
 * textos para redes y prompts listos para pegar en cada herramienta externa.
 * El panel y la función comparten estas reglas (DD-33).
 */

/** Tipos de pieza; cada uno tiene su propio formato y, si aplica, su herramienta. */
export const TIPOS_PIEZA = [
	"publicacion",
	"carrusel",
	"prompt_imagen",
	"prompt_seedance",
	"variantes_gancho",
	"ideas",
	"calendario",
	"revision",
] as const;

/** Tipo de pieza. */
export type TipoPieza = (typeof TIPOS_PIEZA)[number];

/**
 * Personaje guardado en la cuenta de Dreamina con la foto de la presentadora.
 * Pegado como texto no queda enlazado: hay que escribir @ y elegirlo en la lista.
 */
export const PERSONAJE_DREAMINA = "@fresura";

/** Límite por generación que usa el equipo de Fresura en Dreamina. */
export const MAXIMO_DURACION_SEEDANCE = 15;

/** Dirección de voz que viaja en cada prompt con diálogo de la presentadora. */
export const VOZ_PRESENTADORA_SEEDANCE =
	"La presentadora habla a cámara con una voz natural y cálida, en español de Colombia, como si le recomendara el postre a una amiga. Usa tuteo, un ritmo conversado, pausas breves y una entonación espontánea. Di frases cortas y completas con palabras comunes y fáciles de pronunciar. Evita la cadencia robótica y el tono de locución. Sincroniza sus labios con cada frase y conserva el mismo timbre, acento y ritmo entre clips.";

/** Dirección de ritmo y continuidad que se copia con cada clip de Dreamina. */
export const CONTINUIDAD_CLIP_SEEDANCE =
	"El clip se siente natural de principio a fin. Si hay diálogo, termina cada frase dentro del clip y deja solo pausas breves y naturales, sin silencios incómodos. Si cambia el plano principal o la escena, enlaza las tomas con un gesto, una mirada o un movimiento que continúe de una a otra. Evita los saltos bruscos.";

/** Dreamina (CapCut): videos con Seedance. No tiene API oficial. */
const URL_DREAMINA = "https://dreamina.capcut.com/ai-tool/ai-video";

/** Herramienta externa donde se pega la pieza; las demás se copian sin abrir nada. */
export const HERRAMIENTA_PIEZA: Partial<
	Record<TipoPieza, { nombre: string; url: string }>
> = {
	carrusel: { nombre: "Canva", url: "https://www.canva.com/" },
	prompt_imagen: { nombre: "Gemini", url: "https://gemini.google.com/app" },
	prompt_seedance: { nombre: "Dreamina", url: URL_DREAMINA },
};

/** Nombre visible de cada tipo, para el panel y la biblioteca. */
export const NOMBRE_PIEZA: Record<TipoPieza, string> = {
	publicacion: "Publicación",
	carrusel: "Carrusel",
	prompt_imagen: "Prompt de foto",
	prompt_seedance: "Prompt de Seedance",
	variantes_gancho: "Variantes de gancho",
	ideas: "Ideas de contenido",
	calendario: "Calendario de publicaciones",
	revision: "Revisión antes de publicar",
};

/** Bloques permitidos por tipo: [mínimo, máximo]. Un carrusel de Instagram admite 10 imágenes. */
export const BLOQUES_PIEZA: Record<TipoPieza, readonly [number, number]> = {
	publicacion: [1, 3],
	carrusel: [5, 14],
	prompt_imagen: [1, 4],
	prompt_seedance: [1, 2],
	variantes_gancho: [2, 3],
	ideas: [3, 8],
	calendario: [3, 31],
	revision: [3, 12],
};

const bloque = z.strictObject({
	etiqueta: z.string().trim().min(1).max(60),
	texto: z.string().trim().min(1).max(2200),
});

/**
 * Forma que el agente envía con `entregar_pieza`. Los límites por tipo se
 * comprueban aparte, con `erroresPieza`, para devolverle mensajes claros.
 */
export const esquemaPieza = z.strictObject({
	tipo: z.enum(TIPOS_PIEZA),
	titulo: z.string().trim().min(1).max(80),
	red: z.enum(["instagram", "tiktok", "facebook"]).nullable(),
	bloques: z.array(bloque).min(1).max(31),
});

/** Pieza validada. */
export type Pieza = z.infer<typeof esquemaPieza>;

/** Reglas por tipo que el esquema no expresa. Devuelve una lista vacía si cumple. */
export function erroresPieza(pieza: Pieza): string[] {
	const errores: string[] = [];
	const [minimo, maximo] = BLOQUES_PIEZA[pieza.tipo];
	if (pieza.bloques.length < minimo || pieza.bloques.length > maximo)
		errores.push(
			`Un ${NOMBRE_PIEZA[pieza.tipo].toLowerCase()} lleva entre ${minimo} y ${maximo} bloques; enviaste ${pieza.bloques.length}.`,
		);
	if (pieza.tipo === "carrusel") {
		const laminas = pieza.bloques.filter((b) =>
			/^l[aá]mina/i.test(b.etiqueta),
		).length;
		if (laminas < 3 || laminas > 10)
			errores.push(
				`El carrusel lleva de 3 a 10 bloques con etiqueta «Lámina N»; tiene ${laminas}.`,
			);
		if (!pieza.bloques.some((b) => /^prompt para canva/i.test(b.etiqueta)))
			errores.push(
				"Agrega el bloque «Prompt para Canva IA» con el carrusel completo.",
			);
	}
	if (pieza.tipo === "prompt_seedance")
		for (const bloque of pieza.bloques) {
			if (/^c[oó]mo usar/i.test(bloque.etiqueta)) continue;
			const menciones = bloque.texto.split(PERSONAJE_DREAMINA).length - 1;
			const duracion = Number(
				bloque.texto.match(/^Duración del clip: (\d+) segundos?\.$/im)?.[1],
			);
			if (!(duracion >= 1 && duracion <= MAXIMO_DURACION_SEEDANCE))
				errores.push(
					`Indica una duración de 1 a ${MAXIMO_DURACION_SEEDANCE} s en una línea «Duración del clip: N segundos.» y entrega solo un clip por pieza.`,
				);
			if (
				menciones > 0 &&
				/\b(?:la presentadora|ella) dice\s*:/i.test(bloque.texto) &&
				!bloque.texto.includes(VOZ_PRESENTADORA_SEEDANCE)
			)
				errores.push(
					`Incluye esta indicación completa en el bloque «Prompt» de cada clip con diálogo: ${VOZ_PRESENTADORA_SEEDANCE}`,
				);
			if (!bloque.texto.includes(CONTINUIDAD_CLIP_SEEDANCE))
				errores.push(
					`Incluye esta indicación completa en el bloque «Prompt» de cada clip: ${CONTINUIDAD_CLIP_SEEDANCE}`,
				);
			if (/presentadora/i.test(bloque.texto) && menciones === 0)
				errores.push(
					`La presentadora es el personaje ${PERSONAJE_DREAMINA} guardado en Dreamina: escríbelo al inicio del prompt.`,
				);
			// Dreamina solo enlaza el personaje si se elige en la lista al escribir
			// @: va una sola vez y al inicio, para que la persona lo marque en un paso.
			if (menciones > 1)
				errores.push(
					`Escribe ${PERSONAJE_DREAMINA} una sola vez, al inicio; después nómbrala «la presentadora» o «ella».`,
				);
			if (
				menciones === 1 &&
				!bloque.texto.trimStart().startsWith(PERSONAJE_DREAMINA)
			)
				errores.push(`El prompt empieza con ${PERSONAJE_DREAMINA} al inicio.`);
		}
	if (
		(pieza.tipo === "publicacion" || pieza.tipo === "carrusel") &&
		pieza.red === null
	)
		errores.push("Indica la red de la publicación.");
	return errores;
}

/** Texto completo para copiar: cada bloque con su etiqueta. */
export function textoPieza(pieza: Pieza): string {
	return [
		pieza.titulo,
		...pieza.bloques.map((b) => `${b.etiqueta}\n${b.texto}`),
	].join("\n\n");
}

/**
 * Lo que se pega en la herramienta externa. Si hay un bloque «Prompt para …»
 * (el del carrusel para Canva IA), se copia solo ese, porque ya trae todo; si
 * no, los bloques de prompt sin la explicación «Cómo usar».
 */
export function promptPieza(pieza: Pieza): string {
	const directo = pieza.bloques.find((b) => /^prompt para/i.test(b.etiqueta));
	if (directo) return directo.texto;
	const prompts = pieza.bloques.filter(
		(b) => !/^c[oó]mo usar/i.test(b.etiqueta),
	);
	return prompts
		.map((b) => (prompts.length > 1 ? `${b.etiqueta}\n${b.texto}` : b.texto))
		.join("\n\n");
}
