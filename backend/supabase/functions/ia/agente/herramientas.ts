import type { Contenido } from "../../_shared/esquemas/contenido.ts";
import {
	crearEsquemaGuion,
	type Guion,
	type InstruccionGuion,
	maximoCaracteresVoz,
} from "../../_shared/esquemas/guion.ts";
import { datosDelProducto } from "../skills/instrucciones.ts";
import { preciosPublicados, validarGuionContraDatos } from "./validadores.ts";

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
	return (
		datosDelProducto(contenido, productoId, hoy) ?? {
			error: "Ese producto no existe o no está vigente. Usa listar_productos.",
		}
	);
}

/** Promociones vigentes en `hoy` (fecha de Colombia), con el nombre de sus productos. */
export function verPromociones(contenido: Contenido, hoy: string) {
	const nombres = new Map(contenido.productos.map((p) => [p.id, p.nombre]));
	return contenido.promociones
		.filter(
			(promo) => promo.vigencia.desde <= hoy && hoy <= promo.vigencia.hasta,
		)
		.map((promo) => ({
			titulo: promo.titulo,
			desde: promo.vigencia.desde,
			hasta: promo.vigencia.hasta,
			condiciones: promo.condiciones,
			productos: promo.productos.map((id) => ({
				id,
				nombre: nombres.get(id) ?? id,
			})),
		}));
}

/** Sedes sin coordenadas ni WhatsApp (A-19, PU-18): solo lo que sirve para un guion. */
export function verSedes(contenido: Contenido) {
	return contenido.negocio.sedes.map((s) => ({
		nombre: s.nombre,
		direccion: s.direccion,
		horarios: s.horarios,
		atiende_pedidos: s.atiende_pedidos,
	}));
}

/** Título y texto de presentación del negocio. */
export function verNegocio(contenido: Contenido) {
	return contenido.negocio.presentacion;
}

/** Lo que `entregarGuion` necesita saber de la conversación en curso. */
export type ContextoEntrega = {
	contenido: Contenido;
	/** Ids que el agente consultó con `ver_producto` en este turno o antes. */
	productosConsultados: ReadonlySet<string>;
};

/** Resultado de `entregar_guion`: el borrador listo para mostrar, o los errores para corregir. */
export type ResultadoEntrega =
	| { ok: true; instruccion: InstruccionGuion; guion: Guion }
	| { ok: false; errores: string[] };

/**
 * Valida el guion que entrega el agente. Exige haber consultado la ficha del
 * producto (NT-12) y reúne todos los errores (tiempos, máximo de voz, producto y
 * precios) para que el agente los corrija de una vez. No escribe en ninguna tabla.
 */
export function entregarGuion(
	{ instruccion, guion }: { instruccion: InstruccionGuion; guion: Guion },
	{ contenido, productosConsultados }: ContextoEntrega,
): ResultadoEntrega {
	if (!productosConsultados.has(instruccion.producto_id)) {
		return {
			ok: false,
			errores: [
				`Antes de entregar, consulta el producto ${instruccion.producto_id} con ver_producto.`,
			],
		};
	}
	const producto = contenido.productos.find(
		(p) => p.id === instruccion.producto_id && p.vigente,
	);
	if (!producto) {
		return {
			ok: false,
			errores: [
				"Ese producto no existe o no está vigente. Usa listar_productos.",
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
			producto.nombre,
			preciosPublicados(contenido),
		),
	);
	return errores.length > 0
		? { ok: false, errores }
		: { ok: true, instruccion, guion };
}
