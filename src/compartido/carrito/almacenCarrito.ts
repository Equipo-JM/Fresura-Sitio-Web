import {
	claveLinea,
	type LineaCarrito,
	MAX_LINEAS,
	MAX_UNIDADES,
} from "./reglas";

/** Clave de sessionStorage del carrito (la misma del prototipo). */
const CLAVE = "fresura-carrito";

/** Lee el carrito guardado en la pestaña. Si no se puede leer, empieza vacío. */
function leerGuardado(): LineaCarrito[] {
	try {
		const guardado = sessionStorage.getItem(CLAVE);
		if (!guardado) return [];
		const datos: unknown = JSON.parse(guardado);
		return Array.isArray(datos) ? datos.filter(esLinea) : [];
	} catch {
		return [];
	}
}

/** Comprueba la forma de una línea guardada; descarta lo que no la cumple. */
function esLinea(valor: unknown): valor is LineaCarrito {
	if (typeof valor !== "object" || valor === null) return false;
	const l = valor as Partial<LineaCarrito>;
	return (
		typeof l.idProducto === "string" &&
		typeof l.idPresentacion === "string" &&
		typeof l.seleccion === "object" &&
		l.seleccion !== null &&
		typeof l.cantidad === "number" &&
		typeof l.indicaciones === "string"
	);
}

let lineas: LineaCarrito[] = leerGuardado();
const suscriptores = new Set<() => void>();

function publicar(nuevas: LineaCarrito[]) {
	lineas = nuevas;
	try {
		sessionStorage.setItem(CLAVE, JSON.stringify(lineas));
	} catch {
		// Sin almacenamiento el carrito vive solo en memoria, como dice el aviso.
	}
	for (const avisar of suscriptores) avisar();
}

/** Suscribe a los cambios del carrito. Devuelve la función para cancelar. */
export function suscribirCarrito(avisar: () => void): () => void {
	suscriptores.add(avisar);
	return () => suscriptores.delete(avisar);
}

/** Líneas actuales. Devuelve siempre la misma referencia hasta que cambian. */
export function leerCarrito(): LineaCarrito[] {
	return lineas;
}

/**
 * Agrega una línea. Si ya existe una igual, suma la cantidad sin pasar el máximo
 * por producto. Devuelve un mensaje si no se pudo agregar.
 */
export function agregarLinea(nueva: LineaCarrito): string | null {
	const clave = claveLinea(nueva);
	const existente = lineas.find((l) => claveLinea(l) === clave);
	if (existente) {
		const total = existente.cantidad + nueva.cantidad;
		if (total > MAX_UNIDADES) {
			return `Puedes llevar hasta ${MAX_UNIDADES} unidades por producto. Ya tienes ${existente.cantidad} en el carrito.`;
		}
		publicar(
			lineas.map((l) => (l === existente ? { ...l, cantidad: total } : l)),
		);
		return null;
	}
	if (lineas.length >= MAX_LINEAS) {
		return `Tu carrito ya tiene ${MAX_LINEAS} productos, el máximo por pedido.`;
	}
	publicar([...lineas, nueva]);
	return null;
}

/** Cambia la cantidad de una línea dentro de sus límites. */
export function cambiarCantidad(indice: number, delta: number) {
	publicar(
		lineas.map((l, i) =>
			i === indice
				? {
						...l,
						cantidad: Math.min(MAX_UNIDADES, Math.max(1, l.cantidad + delta)),
					}
				: l,
		),
	);
}

/** Quita una línea del carrito. */
export function quitarLinea(indice: number) {
	publicar(lineas.filter((_, i) => i !== indice));
}

/** Vacía el carrito (lo usa la pantalla de confirmación y las pruebas). */
export function vaciarCarrito() {
	publicar([]);
}
