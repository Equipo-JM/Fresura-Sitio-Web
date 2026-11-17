import {
	type Contenido,
	esquemaContenido,
} from "../../../../backend/supabase/functions/_shared/esquemas/contenido";

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
 * Fuente principal: la versión publicada en Supabase (DT-01, sección 4), leída
 * con `fetch` a la API REST y la clave publicable (rol `anon`). No se usa el
 * cliente completo de Supabase: sumaba inicio de sesión, tiempo real y
 * almacenamiento al JavaScript que descarga cada visitante (RNF-04). Las
 * columnas se piden por nombre porque `anon` solo tiene permiso sobre las
 * públicas; un `select=*` sería rechazado.
 *
 * @throws si faltan `VITE_SUPABASE_URL` o `VITE_SUPABASE_PUBLISHABLE_KEY`, o si
 * la respuesta no es correcta; quien lee el contenido usa entonces el respaldo.
 */
export const leerContenidoPrincipal: LectorContenido = async () => {
	const url = import.meta.env.VITE_SUPABASE_URL;
	const clavePublicable = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
	if (!url || !clavePublicable) {
		throw new Error(
			"Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en el entorno",
		);
	}
	const respuesta = await fetch(
		`${url}/rest/v1/versiones_contenido?select=json&estado=eq.publicada`,
		{
			headers: {
				apikey: clavePublicable,
				// Exactamente una fila, como `.single()` del cliente.
				Accept: "application/vnd.pgrst.object+json",
			},
		},
	);
	if (!respuesta.ok) {
		throw new Error(
			`No se pudo leer la versión publicada: HTTP ${respuesta.status}`,
		);
	}
	const fila: unknown = await respuesta.json();
	if (typeof fila !== "object" || fila === null || !("json" in fila)) {
		throw new Error("La versión publicada no trae su contenido");
	}
	return fila.json;
};

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
