import type { Contenido } from "../../_shared/esquemas/contenido.ts";
import {
	crearEsquemaGuion,
	type Guion,
	type InstruccionGuion,
	maximoCaracteresVoz,
} from "../../_shared/esquemas/guion.ts";
import { NOSOTROS } from "../../_shared/presentacion.ts";
import { datosDelProducto } from "../skills/instrucciones.ts";
import {
	preciosDelProducto,
	preciosPublicados,
	validarGuionContraDatos,
} from "./validadores.ts";

/**
 * Lógica de las herramientas del agente conversacional (DT-01, 25.6): funciones
 * puras de solo lectura sobre la versión publicada, ya leída con el token del
 * administrador. `agente.ts` las expone al modelo; ninguna escribe ni sale a la red.
 */

/** Producto resumido para elegir el id correcto entre nombres repetidos. */
export type ProductoListado = {
	id: string;
	nombre: string;
	categoria: string;
	tamanos: { nombre: string; precio?: number }[];
};

/**
 * Productos vigentes con su categoría y tamaños. `categoria` filtra por id o por
 * nombre de categoría, sin importar mayúsculas.
 */
export function listarProductos(
	contenido: Contenido,
	categoria?: string,
): ProductoListado[] {
	const nombres = new Map(contenido.categorias.map((c) => [c.id, c.nombre]));
	const filtro = categoria?.trim().toLowerCase();
	return contenido.productos
		.filter((p) => p.vigente)
		.filter(
			(p) =>
				!filtro ||
				p.categoria.toLowerCase() === filtro ||
				nombres.get(p.categoria)?.toLowerCase() === filtro,
		)
		.map((p) => ({
			id: p.id,
			nombre: p.nombre,
			categoria: nombres.get(p.categoria) ?? p.categoria,
			tamanos: p.presentaciones.map((t) => ({
				nombre: t.nombre,
				...(t.precio !== null && { precio: t.precio }),
			})),
		}));
}

/** Ficha del producto con promociones vigentes, o un error para que el agente use la lista. */
export function verProducto(
	contenido: Contenido,
	productoId: string,
	hoy: string,
) {
	const producto = contenido.productos.find(
		(p) => p.id === productoId && p.vigente,
	);
	const ficha = datosDelProducto(contenido, productoId, hoy);
	if (!producto || !ficha)
		return {
			error: "Ese producto no existe o no está vigente. Usa listar_productos.",
		};
	const { opciones: _, ...datos } = ficha;
	return {
		...datos,
		destacado: producto.destacado,
		foto_alt: producto.imagen.alt,
		opciones: producto.grupos_opciones,
	};
}

/**
 * Promociones vigentes en `hoy` (fecha de Colombia), con sus productos vigentes.
 * Una promoción sin productos vigentes no se entrega.
 */
export function verPromociones(contenido: Contenido, hoy: string) {
	const vigentes = new Map(
		contenido.productos.filter((p) => p.vigente).map((p) => [p.id, p.nombre]),
	);
	return contenido.promociones
		.filter(
			(promo) => promo.vigencia.desde <= hoy && hoy <= promo.vigencia.hasta,
		)
		.map((promo) => ({
			titulo: promo.titulo,
			desde: promo.vigencia.desde,
			hasta: promo.vigencia.hasta,
			condiciones: promo.condiciones,
			productos: promo.productos
				.filter((id) => vigentes.has(id))
				.map((id) => ({ id, nombre: vigentes.get(id) ?? id })),
		}))
		.filter((promo) => promo.productos.length > 0);
}

/** Sedes sin coordenadas ni WhatsApp (A-19, PU-18): solo lo que sirve para un guion. */
export function verSedes(contenido: Contenido) {
	return contenido.negocio.sedes.map((s) => ({
		nombre: s.nombre,
		direccion: s.direccion,
		horarios: s.horarios,
		atiende_pedidos: s.atiende_pedidos,
		radio_domicilio_km: s.radio_domicilio_km,
	}));
}

/** Datos comerciales y de ayuda que el sitio pone a disposición del público. */
export function verNegocio(contenido: Contenido) {
	const { presentacion, whatsapp, redes } = contenido.negocio;
	const { mostrar, calificacion, numero_opiniones, fecha_corte } =
		contenido.opiniones;
	return {
		estado_contenido: contenido.estado,
		presentacion,
		nosotros: NOSOTROS,
		whatsapp,
		redes,
		categorias: contenido.categorias,
		preguntas_frecuentes: contenido.preguntas_frecuentes,
		opiniones: mostrar ? { calificacion, numero_opiniones, fecha_corte } : null,
	};
}

/** Lo que `entregarGuion` necesita saber de la conversación en curso. */
export type ContextoEntrega = {
	contenido: Contenido;
	/** Ids que el agente consultó con `ver_producto` en este turno. */
	productosConsultados: ReadonlySet<string>;
};

/** Resultado de `entregar_guion`: el borrador listo para mostrar, o los errores para corregir. */
export type ResultadoEntrega =
	| { ok: true; instruccion: InstruccionGuion; guion: Guion }
	| { ok: false; errores: string[] };

/**
 * Valida el guion que entrega el agente. Exige haber consultado la ficha del
 * producto cuando el guion tiene uno y reúne todos los errores (tiempos, máximo de voz, producto y
 * precios) para que el agente los corrija de una vez. No escribe en ninguna tabla.
 */
export function entregarGuion(
	{ instruccion, guion }: { instruccion: InstruccionGuion; guion: Guion },
	{ contenido, productosConsultados }: ContextoEntrega,
): ResultadoEntrega {
	const id = instruccion.producto_id;
	const producto =
		id === null
			? undefined
			: contenido.productos.find((p) => p.id === id && p.vigente);
	if (id !== null && !producto) {
		return {
			ok: false,
			errores: [
				"Ese producto no existe o no está vigente. Usa listar_productos.",
			],
		};
	}
	if (id !== null && !productosConsultados.has(id)) {
		return {
			ok: false,
			errores: [
				`Antes de entregar, consulta el producto ${id} con ver_producto.`,
			],
		};
	}

	const errores: string[] = [];
	const estructura = crearEsquemaGuion(instruccion.duracion_s).safeParse(guion);
	if (!estructura.success) {
		errores.push(
			...estructura.error.issues.map((i) =>
				i.path.length > 0 ? `${i.path.join(".")}: ${i.message}` : i.message,
			),
		);
	}
	const voz = guion.escenas.reduce((total, e) => total + e.voz.length, 0);
	const maximo = maximoCaracteresVoz(instruccion.duracion_s);
	if (voz > maximo) {
		errores.push(`La voz suma ${voz} caracteres y el máximo es ${maximo}.`);
	}
	errores.push(
		...validarGuionContraDatos(
			guion,
			producto?.nombre ?? null,
			producto ? preciosDelProducto(producto) : preciosPublicados(contenido),
			contenido.negocio.sedes.map((sede) => sede.nombre),
		),
	);
	return errores.length > 0
		? { ok: false, errores }
		: { ok: true, instruccion, guion };
}
