import type { Contenido } from "../../../supabase/functions/_shared/esquemas/contenido";

/** Producto del contenido, tal como lo valida el contrato 1.0.1. */
export type Producto = Contenido["productos"][number];
/** Grupo de opciones de un producto (base, toppings…). */
export type GrupoOpciones = Producto["grupos_opciones"][number];
/** Elecciones de una línea: id de grupo → ids de las opciones elegidas. */
export type Seleccion = Record<string, string[]>;
/** Forma de entrega. Vacía mientras la persona no la ha elegido. */
export type Entrega = "domicilio" | "recoger" | "";

/** Una línea del carrito, con lo que la persona eligió para ese producto. */
export type LineaCarrito = {
	idProducto: string;
	idPresentacion: string;
	seleccion: Seleccion;
	cantidad: number;
	indicaciones: string;
};

/** Datos de contacto y entrega que pide el paso 2 del carrito. */
export type DatosEntrega = {
	correo: string;
	telefono: string;
	nombre: string;
	apellidos: string;
	direccion: string;
	casa: string;
	barrio: string;
	ciudad: string;
	empresa: string;
	observaciones: string;
};

/** Límites del pedido (prototipo aprobado: hasta 10 productos y 10 unidades por producto). */
export const MAX_LINEAS = 10;
export const MAX_UNIDADES = 10;
export const MAX_INDICACIONES = 120;
export const MAX_OBSERVACIONES = 300;

/** Datos vacíos del formulario de entrega. */
export const DATOS_VACIOS: DatosEntrega = {
	correo: "",
	telefono: "",
	nombre: "",
	apellidos: "",
	direccion: "",
	casa: "",
	barrio: "",
	ciudad: "Bogotá",
	empresa: "",
	observaciones: "",
};

/**
 * Suma de los adicionales de las opciones elegidas. Solo cuenta lo que existe
 * en el contenido: un id desconocido no suma nada.
 */
export function costoSeleccion(
	producto: Producto,
	seleccion: Seleccion,
): number {
	return producto.grupos_opciones.reduce((total, grupo) => {
		const elegidas = seleccion[grupo.id] ?? [];
		return (
			total +
			grupo.opciones
				.filter((opcion) => elegidas.includes(opcion.id))
				.reduce((suma, opcion) => suma + opcion.adicional, 0)
		);
	}, 0);
}

/**
 * Si la persona puede marcar una opción más en su grupo. Quitar una opción
 * siempre se permite; agregar requiere estar por debajo del máximo del contrato.
 */
export function puedeElegir(
	grupo: GrupoOpciones,
	seleccion: Seleccion,
	idOpcion: string,
): boolean {
	const elegidas = seleccion[grupo.id] ?? [];
	if (elegidas.includes(idOpcion)) return true;
	return elegidas.length < grupo.maximo;
}

/**
 * Precio de una línea: presentación más adicionales, por unidad y por la
 * cantidad. Devuelve `null` si no hay precio publicado (respaldo, DD-14).
 */
export function precioLinea(
	producto: Producto,
	linea: LineaCarrito,
): number | null {
	const presentacion = producto.presentaciones.find(
		(p) => p.id === linea.idPresentacion,
	);
	if (!presentacion || presentacion.precio === null) return null;
	const unitario =
		presentacion.precio + costoSeleccion(producto, linea.seleccion);
	return unitario * linea.cantidad;
}

/** Total de las líneas con precio y si alguna quedó sin precio por confirmar. */
export function totalCarrito(
	lineas: LineaCarrito[],
	productos: Producto[],
): { total: number; pendiente: boolean } {
	let total = 0;
	let pendiente = false;
	for (const linea of lineas) {
		const producto = productos.find((p) => p.id === linea.idProducto);
		const precio = producto ? precioLinea(producto, linea) : null;
		if (precio === null) pendiente = true;
		else total += precio;
	}
	return { total, pendiente };
}

/** Pesos colombianos con punto de miles: 14900 → «$14.900». */
export function pesos(valor: number): string {
	return `$${String(valor).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

/** Nombre completo de la línea: categoría y producto, como se muestra en el carrito. */
export function nombreProducto(
	producto: Producto,
	categorias: Contenido["categorias"],
): string {
	const categoria = categorias.find((c) => c.id === producto.categoria);
	return categoria
		? `${categoria.nombre}: ${producto.nombre}`
		: producto.nombre;
}

/** Nombre de la persona con sus apellidos, sin espacios sobrantes. */
export function nombreCompleto(datos: DatosEntrega): string {
	return `${datos.nombre.trim()} ${datos.apellidos.trim()}`.trim();
}

/** Dirección con casa o apartamento, si la hay. */
export function direccionCompleta(datos: DatosEntrega): string {
	return [datos.direccion.trim(), datos.casa.trim()].filter(Boolean).join(", ");
}

/**
 * Errores del formulario de entrega, por campo. Vacío si todo está bien.
 * El correo es obligatorio y el barrio, la dirección y la ciudad solo se piden a domicilio.
 */
export function validarDatos(
	datos: DatosEntrega,
	entrega: Entrega,
): Partial<Record<keyof DatosEntrega | "entrega", string>> {
	const errores: Partial<Record<keyof DatosEntrega | "entrega", string>> = {};
	if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(datos.correo.trim())) {
		errores.correo = datos.correo.trim()
			? "Revisa el correo, por ejemplo: nombre@correo.com."
			: "Escribe tu correo electrónico.";
	}
	if (!/^(\+?57)?\d{10}$/.test(datos.telefono.replace(/[\s-]/g, ""))) {
		errores.telefono = "Escribe un teléfono de 10 dígitos.";
	}
	if (!entrega) errores.entrega = "Elige cómo quieres recibir tu pedido.";
	if (!datos.nombre.trim()) errores.nombre = "Escribe tu nombre.";
	if (!datos.apellidos.trim()) errores.apellidos = "Escribe tus apellidos.";
	if (entrega === "domicilio") {
		if (!datos.direccion.trim()) errores.direccion = "Escribe tu dirección.";
		if (!datos.barrio.trim()) errores.barrio = "Escribe tu barrio.";
		if (!datos.ciudad.trim()) errores.ciudad = "Escribe tu ciudad.";
	}
	return errores;
}

/**
 * Texto del mensaje de WhatsApp, con el formato de negrita de WhatsApp (*así*).
 * Los nombres de producto, las elecciones y la sede vienen del contenido, no de la persona.
 */
export function mensajePedido({
	lineas,
	productos,
	categorias,
	datos,
	entrega,
	total,
	pendiente,
	sede,
}: {
	lineas: LineaCarrito[];
	productos: Producto[];
	categorias: Contenido["categorias"];
	datos: DatosEntrega;
	entrega: Entrega;
	total: number;
	pendiente: boolean;
	/** Sede que atiende pedidos; se nombra cuando la persona recoge. */
	sede?: { nombre: string; direccion: string };
}): string {
	const partes: string[] = [];
	lineas.forEach((linea, indice) => {
		const producto = productos.find((p) => p.id === linea.idProducto);
		if (!producto) return;
		const presentacion = producto.presentaciones.find(
			(p) => p.id === linea.idPresentacion,
		);
		const tamano = presentacion ? `, ${presentacion.nombre}` : "";
		partes.push(
			`${indice + 1}. *${nombreProducto(producto, categorias)}*${tamano} × ${linea.cantidad}`,
		);
		for (const grupo of producto.grupos_opciones) {
			const elegidas = linea.seleccion[grupo.id] ?? [];
			if (elegidas.length === 0) continue;
			const nombres = grupo.opciones
				.filter((o) => elegidas.includes(o.id))
				.map((o) => o.nombre);
			partes.push(`   ${grupo.nombre}: ${nombres.join(", ")}`);
		}
		if (linea.indicaciones.trim()) {
			partes.push(`   Indicaciones: ${linea.indicaciones.trim()}`);
		}
	});
	partes.push("");
	partes.push(
		`*Total estimado:* ${pesos(total)}${pendiente ? " (sin productos por confirmar)" : ""}`,
	);
	partes.push(`*Nombre:* ${nombreCompleto(datos)}`);
	partes.push(`*Correo:* ${datos.correo.trim()}`);
	partes.push(`*Teléfono:* ${datos.telefono.trim()}`);
	partes.push(
		`*Entrega:* ${entrega === "domicilio" ? "Domicilio" : `Recoger en ${sede ? `${sede.nombre} (${sede.direccion})` : "la sede"}`}`,
	);
	if (entrega === "domicilio") {
		if (datos.empresa.trim()) partes.push(`*Empresa:* ${datos.empresa.trim()}`);
		partes.push(`*Dirección:* ${direccionCompleta(datos)}`);
		partes.push(
			`*Barrio y ciudad:* ${datos.barrio.trim()}, ${datos.ciudad.trim()}`,
		);
	}
	if (datos.observaciones.trim()) {
		partes.push(`*Observaciones:* ${datos.observaciones.trim()}`);
	}
	return partes.join("\n");
}

/** Distancia en km entre dos puntos (fórmula del haversine, sin dependencias). */
export function distanciaKm(
	a: { lat: number; lng: number },
	b: { lat: number; lng: number },
): number {
	const radio = 6371;
	const aRad = (grados: number) => (grados * Math.PI) / 180;
	const dLat = aRad(b.lat - a.lat);
	const dLng = aRad(b.lng - a.lng);
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(aRad(a.lat)) * Math.cos(aRad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return 2 * radio * Math.asin(Math.sqrt(h));
}

/** Clave que identifica una línea igual a otra: mismo producto, tamaño, elecciones e indicaciones. */
export function claveLinea(linea: LineaCarrito): string {
	const seleccion = Object.keys(linea.seleccion)
		.sort()
		.map((grupo) => `${grupo}:${[...linea.seleccion[grupo]].sort().join("|")}`)
		.join(";");
	return [
		linea.idProducto,
		linea.idPresentacion,
		seleccion,
		linea.indicaciones.trim(),
	].join("#");
}
