import { comprobarAdministrador, type VerificarJwt } from "./acceso.ts";
import { cabecerasCors, responderError } from "./http.ts";

/**
 * Esqueleto común de las funciones `panel` e `ia` (DT-01, sección 23): en este
 * orden, comprueba el origen (CORS), responde la consulta previa, busca la ruta,
 * exige un administrador con segundo paso y atiende la ruta. Un error no
 * previsto se registra solo por su tipo y responde 500 con un mensaje genérico.
 */

/** Lo que recibe una ruta, ya con el acceso comprobado. */
export type ContextoRuta = {
	peticion: Request;
	/** JWT del administrador, para leer y escribir con RLS. */
	jwt: string;
	/** `sub` del JWT: identificador del administrador en `auth.users`. */
	usuario: string;
	/** Cabeceras CORS que debe llevar toda respuesta. */
	cors: Record<string, string>;
};

/** Atiende una ruta `POST`. */
export type ManejadorRuta = (contexto: ContextoRuta) => Promise<Response>;

/** Configuración de una función. */
export type OpcionesServidor = {
	origenesPermitidos: readonly string[];
	verificarJwt: VerificarJwt;
	/** Rutas por su último segmento, por ejemplo `{ guion: ... }` para `POST /guion`. */
	rutas: Record<string, ManejadorRuta>;
	/** Mensaje del 403 para una sesión sin permiso. */
	mensajeSinPermiso: string;
	/** Mensaje del 500 ante un error no previsto. */
	mensajeErrorInterno: string;
	/** Registra un fallo por su tipo, sin datos del formulario ni claves (DD-20). */
	registrarFallo: (tipo: string) => void;
};

/** Crea el manejador que se pasa a `Deno.serve`. */
export function crearServidor(
	opciones: OpcionesServidor,
): (peticion: Request) => Promise<Response> {
	return async (peticion) => {
		const cors = cabecerasCors(
			peticion.headers.get("Origin"),
			opciones.origenesPermitidos,
		);
		if (cors === null) {
			return responderError(403, "origen_no_permitido", "Origen no permitido.");
		}
		if (peticion.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: cors });
		}

		const segmento = new URL(peticion.url).pathname.split("/").pop() ?? "";
		const ruta = Object.hasOwn(opciones.rutas, segmento)
			? opciones.rutas[segmento]
			: undefined;
		if (peticion.method !== "POST" || ruta === undefined) {
			return responderError(404, "no_encontrado", "Ruta no encontrada.", cors);
		}

		const acceso = await comprobarAdministrador(
			peticion.headers.get("Authorization"),
			opciones.verificarJwt,
		);
		if (!acceso.permitido) {
			return acceso.estado === 401
				? responderError(
						401,
						"sin_sesion",
						"Tu sesión terminó. Vuelve a iniciar sesión.",
						cors,
					)
				: responderError(403, "sin_permiso", opciones.mensajeSinPermiso, cors);
		}

		try {
			return await ruta({
				peticion,
				jwt: acceso.jwt,
				usuario: acceso.usuario,
				cors,
			});
		} catch (error) {
			// Los errores propios llevan su tipo en el mensaje (p. ej. "lectura_contenido").
			opciones.registrarFallo(
				error instanceof Error ? error.message : "desconocido",
			);
			return responderError(
				500,
				"error_interno",
				opciones.mensajeErrorInterno,
				cors,
			);
		}
	};
}
