import { z } from "zod";

/**
 * Esquema del contrato de contenido, versión 1.0.1 (ADR-001, D15; DT-01, 19.4).
 *
 * Es la fuente de verdad del contrato: el sitio lo usa para validar lo que lee,
 * y el panel y la función `ia`, para validar antes de publicar. Equivale por
 * comportamiento a `datos/contenido-1.0.1.schema.json` de la bóveda; se
 * comprueba con el ejemplo y los 32 casos de rechazo de `pruebas/`.
 *
 * Además de la forma, aplica las reglas cruzadas RC-1 a RC-8 (ver
 * `comprobarReglasCruzadas`).
 */

/** Versión del contrato que entiende este código. */
export const VERSION_CONTRATO = "1.0.1";

const id = z
	.string()
	.max(80)
	.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

const url = z
	.string()
	.max(500)
	.regex(/^https:\/\/\S+$/);

const whatsapp = z.string().regex(/^57[0-9]{10}$/);

/** RC-8: además del formato, la fecha debe existir en el calendario (no 2026-11-31). */
const fecha = z
	.string()
	.regex(/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/)
	.refine(esFechaReal, {
		message: "RC-8: la fecha no existe en el calendario",
	});

const dinero = z.int().min(0);
const orden = z.int().min(0);

const texto = (maximo: number) => z.string().min(1).max(maximo);

const imagen = z.strictObject({
	ruta: url,
	alt: texto(160),
	ancho: z.int().min(1),
	alto: z.int().min(1),
});

const sede = z.strictObject({
	id,
	nombre: texto(120),
	direccion: texto(120),
	horarios: z
		.array(z.strictObject({ dias: texto(60), horas: texto(60) }))
		.min(1),
	ubicacion: z.strictObject({
		lat: z.number().min(-90).max(90),
		lng: z.number().min(-180).max(180),
	}),
	atiende_pedidos: z.boolean(),
	radio_domicilio_km: z.number().min(0.5).max(50).nullable(),
	whatsapp: whatsapp.nullable(),
});

const grupoOpciones = z.strictObject({
	id,
	nombre: texto(40),
	tipo: z.enum(["una", "varias"]),
	obligatorio: z.boolean(),
	maximo: z.int().min(1),
	opciones: z
		.array(z.strictObject({ id, nombre: texto(40), adicional: dinero }))
		.min(1),
});

const producto = z.strictObject({
	id,
	categoria: id,
	nombre: texto(80),
	descripcion: texto(600),
	imagen,
	vigente: z.boolean(),
	destacado: z.boolean(),
	orden,
	presentaciones: z
		.array(
			z.strictObject({
				id,
				nombre: texto(40),
				descripcion: texto(80).nullable(),
				precio: dinero.nullable(),
			}),
		)
		.min(1),
	caracteristicas: z.array(texto(80)),
	grupos_opciones: z.array(grupoOpciones),
});

const promocion = z.strictObject({
	id,
	titulo: texto(80),
	productos: z.array(id).min(1),
	vigencia: z.strictObject({ desde: fecha, hasta: fecha }),
	condiciones: texto(400),
});

const pregunta = z.strictObject({
	id,
	pregunta: texto(200),
	respuesta: texto(1000),
	orden,
});

const categoria = z.strictObject({ id, nombre: texto(40), orden });

/** Con `mostrar: true`, los cuatro datos de la calificación son obligatorios (RF-12). */
const opiniones = z
	.strictObject({
		mostrar: z.boolean(),
		calificacion: z.number().min(1).max(5).nullable(),
		numero_opiniones: z.int().min(0).nullable(),
		fecha_corte: fecha.nullable(),
		url_ficha: url.nullable(),
	})
	.superRefine((valor, contexto) => {
		if (!valor.mostrar) return;
		for (const campo of [
			"calificacion",
			"numero_opiniones",
			"fecha_corte",
			"url_ficha",
		] as const) {
			if (valor[campo] === null) {
				contexto.addIssue({
					code: "custom",
					path: [campo],
					message: "RF-12: obligatorio cuando las opiniones se muestran",
				});
			}
		}
	});

const formaContenido = z.strictObject({
	version_contrato: z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+$/),
	estado: z.enum(["ejemplo", "real"]),
	categorias: z.array(categoria).min(1),
	negocio: z.strictObject({
		presentacion: z.strictObject({ titulo: texto(80), texto: texto(600) }),
		whatsapp,
		sedes: z.array(sede).min(1).max(5),
		redes: z.strictObject({
			instagram: url.nullable(),
			tiktok: url.nullable(),
			facebook: url.nullable(),
		}),
	}),
	productos: z.array(producto),
	promociones: z.array(promocion),
	preguntas_frecuentes: z.array(pregunta),
	opiniones,
});

/** Contenido del sitio ya validado contra el contrato. */
export type Contenido = z.infer<typeof formaContenido>;

/** Esquema completo: forma del contrato más las reglas cruzadas (RC-8 va en `fecha`). */
export const esquemaContenido = formaContenido.superRefine(
	comprobarReglasCruzadas,
);

type Ruta = (string | number)[];
type Contexto = z.RefinementCtx;

function reportar(contexto: Contexto, path: Ruta, message: string) {
	contexto.addIssue({ code: "custom", path, message });
}

/** Las reglas que el JSON Schema no puede expresar (DT-01, 19.4). */
function comprobarReglasCruzadas(contenido: Contenido, contexto: Contexto) {
	const { sedes } = contenido.negocio;

	// RC-1: exactamente una sede atiende pedidos, y solo esa tiene radio.
	const queAtienden = sedes.filter((s) => s.atiende_pedidos);
	if (queAtienden.length !== 1) {
		reportar(
			contexto,
			["negocio", "sedes"],
			"RC-1: debe haber exactamente una sede que atienda pedidos",
		);
	}
	sedes.forEach((s, i) => {
		const tieneRadio = s.radio_domicilio_km !== null;
		if (s.atiende_pedidos !== tieneRadio) {
			reportar(
				contexto,
				["negocio", "sedes", i, "radio_domicilio_km"],
				"RC-1: solo la sede que atiende pedidos tiene radio de domicilio, y debe tenerlo",
			);
		}
	});

	// RC-2: identificadores únicos en cada lista.
	revisarIdsUnicos(contenido.categorias, ["categorias"], contexto);
	revisarIdsUnicos(sedes, ["negocio", "sedes"], contexto);
	revisarIdsUnicos(contenido.productos, ["productos"], contexto);
	revisarIdsUnicos(contenido.promociones, ["promociones"], contexto);
	revisarIdsUnicos(
		contenido.preguntas_frecuentes,
		["preguntas_frecuentes"],
		contexto,
	);

	const idsCategorias = new Set(contenido.categorias.map((c) => c.id));
	const idsProductos = new Set(contenido.productos.map((p) => p.id));

	contenido.productos.forEach((p, i) => {
		const rutaProducto = ["productos", i];
		revisarIdsUnicos(
			p.presentaciones,
			[...rutaProducto, "presentaciones"],
			contexto,
		);
		revisarIdsUnicos(
			p.grupos_opciones,
			[...rutaProducto, "grupos_opciones"],
			contexto,
		);

		// RC-7: la categoría del producto existe.
		if (!idsCategorias.has(p.categoria)) {
			reportar(
				contexto,
				[...rutaProducto, "categoria"],
				"RC-7: la categoría no existe",
			);
		}

		p.grupos_opciones.forEach((g, j) => {
			const rutaGrupo = [...rutaProducto, "grupos_opciones", j];
			revisarIdsUnicos(g.opciones, [...rutaGrupo, "opciones"], contexto);
			// RC-5: selección única implica máximo 1.
			if (g.tipo === "una" && g.maximo !== 1) {
				reportar(
					contexto,
					[...rutaGrupo, "maximo"],
					"RC-5: con tipo «una», el máximo es 1",
				);
			}
			// RC-6: no se puede pedir más opciones de las que hay.
			if (g.maximo > g.opciones.length) {
				reportar(
					contexto,
					[...rutaGrupo, "maximo"],
					"RC-6: el máximo supera el número de opciones",
				);
			}
		});
	});

	contenido.promociones.forEach((promo, i) => {
		// RC-3: cada producto citado existe.
		promo.productos.forEach((idProducto, j) => {
			if (!idsProductos.has(idProducto)) {
				reportar(
					contexto,
					["promociones", i, "productos", j],
					"RC-3: el producto no existe",
				);
			}
		});
		// RC-4: las fechas ISO se comparan bien como texto.
		if (promo.vigencia.hasta < promo.vigencia.desde) {
			reportar(
				contexto,
				["promociones", i, "vigencia", "hasta"],
				"RC-4: la vigencia termina antes de empezar",
			);
		}
	});
}

function revisarIdsUnicos(
	lista: readonly { id: string }[],
	ruta: Ruta,
	contexto: Contexto,
) {
	const vistos = new Set<string>();
	lista.forEach((elemento, i) => {
		if (vistos.has(elemento.id)) {
			reportar(
				contexto,
				[...ruta, i, "id"],
				`RC-2: id repetido «${elemento.id}»`,
			);
		}
		vistos.add(elemento.id);
	});
}

function esFechaReal(texto: string): boolean {
	const [anio, mes, dia] = texto.split("-").map(Number);
	const calculada = new Date(Date.UTC(anio, mes - 1, dia));
	return (
		calculada.getUTCFullYear() === anio &&
		calculada.getUTCMonth() === mes - 1 &&
		calculada.getUTCDate() === dia
	);
}
