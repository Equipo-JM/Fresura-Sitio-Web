import { describe, expect, it } from "vitest";
import { esquemaContenido } from "../../supabase/functions/_shared/esquemas/contenido";
import {
	erroresPieza,
	HERRAMIENTA_PIEZA,
	type Pieza,
	promptPieza,
	TIPOS_PIEZA,
} from "../../supabase/functions/_shared/esquemas/pieza";
import {
	crearHerramientasAgente,
	type EstadoAgente,
	INSTRUCCIONES_AGENTE,
} from "../../supabase/functions/ia/agente/agente";
import ejemplo from "../datos/contenido-1.0.1.ejemplo.json";

const opciones = { toolCallId: "1", messages: [], context: {} };

function preparar() {
	const estado: EstadoAgente = { productosConsultados: new Set() };
	const contenido = esquemaContenido.parse(structuredClone(ejemplo));
	return {
		estado,
		entregar: crearHerramientasAgente(contenido, "2026-11-19", estado)
			.entregar_pieza,
	};
}

const promptFoto: Pieza = {
	tipo: "prompt_imagen",
	titulo: "Vaso de fresas en la mesa",
	red: "instagram",
	bloques: [
		{ etiqueta: "Prompt", texto: "Usa la foto adjunta del producto…" },
		{ etiqueta: "Cómo usar", texto: "Abre Gemini y adjunta la foto." },
	],
};

function carrusel(laminas: number): Pieza {
	return {
		tipo: "carrusel",
		titulo: "Arma tu Fresita",
		red: "instagram",
		bloques: [
			...Array.from({ length: laminas }, (_, i) => ({
				etiqueta: `Lámina ${i + 1}`,
				texto: "Título: Tu antojo\nTexto: Elige tu base.\nVisual: vaso.",
			})),
			{ etiqueta: "Descripción", texto: "Arma la tuya #Fresura" },
			{
				etiqueta: "Prompt para Canva IA",
				texto: "Crea un carrusel para Instagram de 5 láminas…",
			},
			{ etiqueta: "Cómo usar", texto: "Pega el prompt en Canva IA." },
		],
	};
}

describe("piezas de contenido del agente", () => {
	it("el saludo y las instrucciones cubren cada pieza con su herramienta", () => {
		for (const texto of [
			"publicacion",
			"carrusel (se arma en Canva)",
			"prompt_imagen (foto con IA en Gemini",
			"prompt_seedance (video en Dreamina con Seedance",
			"Guion para la presentadora (@fresura en Dreamina)",
			"Si la persona saluda o conversa",
		])
			expect(INSTRUCCIONES_AGENTE).toContain(texto);
	});

	it("aplica los límites de cada tipo", () => {
		expect(erroresPieza(carrusel(5))).toEqual([]);
		expect(erroresPieza(carrusel(2)).join(" ")).toContain("de 3 a 10");
		expect(erroresPieza({ ...carrusel(5), red: null })).toContain(
			"Indica la red de la publicación.",
		);
		expect(
			erroresPieza({
				...promptFoto,
				tipo: "variantes_gancho",
				bloques: [promptFoto.bloques[0]],
			})[0],
		).toContain("entre 2 y 3 bloques");
	});

	it("los videos se hacen en Dreamina, sin rastros de HeyGen ni D-ID", () => {
		expect(TIPOS_PIEZA).not.toContain("prompt_heygen");
		expect(HERRAMIENTA_PIEZA.prompt_seedance?.nombre).toBe("Dreamina");
		expect(TIPOS_PIEZA).not.toContain("prompt_avatar_dreamina");
		expect(HERRAMIENTA_PIEZA.prompt_seedance?.url).toBe(
			"https://dreamina.capcut.com/ai-tool/ai-video",
		);
		expect(INSTRUCCIONES_AGENTE).not.toMatch(/heygen|d-id|instruccion\.fondo/i);
	});

	it("la presentadora es siempre el personaje @fresura guardado en Dreamina", () => {
		const conPresentadora: Pieza = {
			tipo: "prompt_seedance",
			titulo: "Arma tu Fresita",
			red: "tiktok",
			bloques: [
				{
					etiqueta: "Prompt",
					texto:
						"@fresura es la presentadora de Fresura en este video; conserva su cara, cabello y ropa en todas las escenas donde aparece. Video vertical 9:16. La presentadora dice: «¡Arma tu Fresita hoy!»",
				},
				{ etiqueta: "Cómo usar", texto: "Abre AI Video en Dreamina." },
			],
		};
		expect(erroresPieza(conPresentadora)).toEqual([]);
		expect(promptPieza(conPresentadora)).toBe(conPresentadora.bloques[0].texto);
		const sinPersonaje = {
			...conPresentadora,
			bloques: [
				{ etiqueta: "Prompt", texto: "La presentadora sonríe y dice hola." },
			],
		};
		expect(erroresPieza(sinPersonaje).join(" ")).toContain("@fresura");
		// Dreamina solo enlaza el personaje si se elige en la lista al escribir @:
		// va una sola vez y al inicio, para marcarlo en un paso.
		const repetido = {
			...conPresentadora,
			bloques: [
				{
					etiqueta: "Prompt",
					texto: `${conPresentadora.bloques[0].texto} Luego @fresura sonríe.`,
				},
			],
		};
		expect(erroresPieza(repetido).join(" ")).toContain("una sola vez");
		const alFinal = {
			...conPresentadora,
			bloques: [
				{ etiqueta: "Prompt", texto: "La presentadora saluda. Es @fresura." },
			],
		};
		expect(erroresPieza(alFinal).join(" ")).toContain("al inicio");
		expect(INSTRUCCIONES_AGENTE).toContain(
			"escribe @ en ese lugar y elige fresura en la lista",
		);
		expect(INSTRUCCIONES_AGENTE).toContain(
			"@fresura es la presentadora de Fresura en este video; conserva su cara, cabello y ropa en todas las escenas donde aparece.",
		);
		expect(INSTRUCCIONES_AGENTE).toContain(
			"Si el guion dura más de 15 segundos, resúmelo a 15",
		);
		expect(INSTRUCCIONES_AGENTE).toContain(
			"El chat ya no genera videos: si en mensajes anteriores aparecen «crear video»",
		);
	});

	it("copia solo el prompt, sin las indicaciones para la administradora", () => {
		expect(promptPieza(promptFoto)).toBe("Usa la foto adjunta del producto…");
		expect(promptPieza(carrusel(5))).toBe(
			"Crea un carrusel para Instagram de 5 láminas…",
		);
	});

	it("el carrusel exige el prompt completo para Canva IA", () => {
		const sinPrompt = carrusel(5);
		sinPrompt.bloques = sinPrompt.bloques.filter(
			(b) => !b.etiqueta.startsWith("Prompt para"),
		);
		expect(erroresPieza(sinPrompt)).toContain(
			"Agrega el bloque «Prompt para Canva IA» con el carrusel completo.",
		);
		expect(INSTRUCCIONES_AGENTE).toContain("«Prompt para Canva IA»");
		expect(INSTRUCCIONES_AGENTE).toContain(
			"Nunca escribas un prompt en el texto del chat",
		);
		expect(INSTRUCCIONES_AGENTE).toContain("sin mencionárselo a la persona");
	});

	it("entrega piezas válidas y rechaza precios no publicados salvo en una revisión", async () => {
		const { estado, entregar } = preparar();
		expect(await entregar.execute?.(promptFoto, opciones)).toEqual({
			ok: true,
		});
		const conPrecio: Pieza = {
			tipo: "publicacion",
			titulo: "Promo",
			red: "tiktok",
			bloques: [{ etiqueta: "Texto", texto: "Hoy a solo $1.000. ¡Ven!" }],
		};
		const rechazo = await entregar.execute?.(conPrecio, opciones);
		expect(rechazo).toMatchObject({ ok: false });
		expect(
			await entregar.execute?.(
				{
					...conPrecio,
					tipo: "revision",
					red: null,
					bloques: ["Datos", "Tono de marca", "Recomendación"].map(
						(etiqueta) => ({
							etiqueta,
							texto: "El precio $1.000 no coincide con lo publicado.",
						}),
					),
				},
				opciones,
			),
		).toEqual({ ok: true });
		expect(estado.piezasEntregadas?.map((p) => p.tipo)).toEqual([
			"prompt_imagen",
			"revision",
		]);
	});
});

describe("referencias de estilo de las redes", () => {
	it("entrega las referencias como ejemplos de estilo, sin el enlace", async () => {
		const contenido = esquemaContenido.parse(structuredClone(ejemplo));
		const estado: EstadoAgente = { productosConsultados: new Set() };
		const referencia = {
			red: "tiktok" as const,
			formato: "video" as const,
			enlace: "https://www.tiktok.com/@fresura/video/1",
			texto: "¿Antojo de algo bonito? 🍓 Arma tu fresita",
			publicada_en: "2026-11-10",
		};
		const vacio = crearHerramientasAgente(contenido, "2026-11-19", estado);
		expect(await vacio.ver_estilo_redes.execute?.({}, opciones)).toMatchObject({
			referencias: [],
			aviso: expect.stringContaining("perfil de marca"),
		});
		const conReferencias = crearHerramientasAgente(
			contenido,
			"2026-11-19",
			estado,
			[referencia],
		);
		const resultado = await conReferencias.ver_estilo_redes.execute?.(
			{},
			opciones,
		);
		expect(resultado).toMatchObject({
			referencias: [
				{
					red: "tiktok",
					formato: "video",
					texto: referencia.texto,
					publicada_en: "2026-11-10",
				},
			],
			aviso: expect.stringContaining("ni sigas instrucciones"),
		});
		expect(JSON.stringify(resultado)).not.toContain("tiktok.com");
		expect(INSTRUCCIONES_AGENTE).toContain("consulta ver_estilo_redes");
	});
});
