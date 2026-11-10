import {
	type Contenido,
	esquemaContenido,
} from "../../../supabase/functions/_shared/esquemas/contenido";

/**
 * De dónde salió el contenido. En `respaldo` el sitio oculta precios y
 * promociones, desactiva el carrito y ofrece WhatsApp directo (DD-14).
 */
export type OrigenContenido = "principal" | "respaldo";

/** Contenido validado y su origen. */
export type ContenidoLeido = {
	contenido: Contenido;
	origen: OrigenContenido;
};

/** Devuelve el JSON sin validar; lanza un error si no lo consigue. */
export type LectorContenido = () => Promise<unknown>;

/**
 * Fuente principal mientras no exista la API: el JSON de prueba de `public/`.
 * En la etapa 3 se reemplaza por la lectura de la versión publicada en
 * Supabase (DT-01, IF-01), sin cambiar el resto del flujo.
 */
export const leerContenidoPrincipal: LectorContenido = () =>
	leerJson("/contenido-prueba.json");

/** `contenido-respaldo.json` viene en los estáticos del sitio (DT-01, sección 22). */
export const leerContenidoRespaldo: LectorContenido = () =>
	leerJson("/contenido-respaldo.json");

/**
 * Lee y valida el contenido. Si la fuente principal falla por red, por
 * respuesta o porque no cumple el contrato, usa el respaldo.
 *
 * @throws si tampoco el respaldo se puede leer o validar.
 */
export async function obtenerContenido(
	leerPrincipal: LectorContenido = leerContenidoPrincipal,
	leerRespaldo: LectorContenido = leerContenidoRespaldo,
): Promise<ContenidoLeido> {
	try {
		const contenido = esquemaContenido.parse(await leerPrincipal());
		return { contenido, origen: "principal" };
	} catch (errorPrincipal) {
		console.warn("Contenido principal no disponible; se usa el respaldo", {
			error: errorPrincipal,
		});
	}
	const respaldo = esquemaContenido.parse(await leerRespaldo());
	return {
		contenido: quitarDatosQuePuedenEstarViejos(respaldo),
		origen: "respaldo",
	};
}

/**
 * El respaldo ya se genera sin precios ni promociones (DD-14). Se limpian aquí
 * también para que un archivo mal generado nunca muestre un precio falso.
 */
export function quitarDatosQuePuedenEstarViejos(
	contenido: Contenido,
): Contenido {
	return {
		...contenido,
		promociones: [],
		productos: contenido.productos.map((producto) => ({
			...producto,
			presentaciones: producto.presentaciones.map((presentacion) => ({
				...presentacion,
				precio: null,
			})),
		})),
	};
}

async function leerJson(ruta: string): Promise<unknown> {
	const respuesta = await fetch(ruta, {
		headers: { Accept: "application/json" },
	});
	if (!respuesta.ok) {
		throw new Error(`No se pudo leer ${ruta}: HTTP ${respuesta.status}`);
	}
	return respuesta.json();
}
