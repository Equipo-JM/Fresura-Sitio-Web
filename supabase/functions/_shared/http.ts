/**
 * Utilidades HTTP comunes de las funciones `panel` e `ia`: orígenes permitidos
 * (CORS), lectura acotada del cuerpo y respuestas JSON con la forma de error
 * `{error, mensaje}` (DT-01, sección 23).
 */

/**
 * Tamaño máximo del cuerpo de una petición: el contrato completo ocupa de 50 a
 * 100 KB (DT-01, sección 12) y una instrucción de guion, menos de 1 KB.
 */
export const MAXIMO_CUERPO_BYTES = 256 * 1024;

/** Convierte `ORIGENES_PERMITIDOS` ("https://a,https://b") en una lista sin vacíos. */
export function leerOrigenesPermitidos(valor: string | undefined): string[] {
	return (valor ?? "")
		.split(",")
		.map((origen) => origen.trim())
		.filter((origen) => origen !== "");
}

/**
 * Cabeceras CORS para un origen permitido, o `null` si el origen falta o no está
 * en la lista. Las funciones solo atienden a los orígenes del sitio.
 */
export function cabecerasCors(
	origen: string | null,
	permitidos: readonly string[],
): Record<string, string> | null {
	if (origen === null || !permitidos.includes(origen)) return null;
	return {
		"Access-Control-Allow-Origin": origen,
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		// Las que envía `supabase.functions.invoke` además del contenido.
		"Access-Control-Allow-Headers":
			"authorization, content-type, apikey, x-client-info",
		// El navegador recuerda la consulta previa una hora y no la repite en cada llamada.
		"Access-Control-Max-Age": "3600",
		Vary: "Origin",
	};
}

/** Resultado de leer el cuerpo: el JSON, o por qué no se pudo. */
export type CuerpoLeido =
	| { valido: true; datos: unknown }
	| { valido: false; motivo: "demasiado_grande" | "no_es_json" };

/**
 * Lee el cuerpo como JSON sin pasar de `maximoBytes`, aunque la cabecera
 * `Content-Length` falte o mienta.
 */
export async function leerCuerpoJson(
	peticion: Request,
	maximoBytes = MAXIMO_CUERPO_BYTES,
): Promise<CuerpoLeido> {
	const declarado = Number(peticion.headers.get("Content-Length") ?? "0");
	if (declarado > maximoBytes) {
		return { valido: false, motivo: "demasiado_grande" };
	}

	const bytes = new Uint8Array(await peticion.arrayBuffer());
	if (bytes.byteLength > maximoBytes) {
		return { valido: false, motivo: "demasiado_grande" };
	}

	try {
		return { valido: true, datos: JSON.parse(new TextDecoder().decode(bytes)) };
	} catch {
		return { valido: false, motivo: "no_es_json" };
	}
}

/** Respuesta JSON con las cabeceras dadas. */
export function responderJson(
	estado: number,
	cuerpo: unknown,
	cabeceras: Record<string, string> = {},
): Response {
	return new Response(JSON.stringify(cuerpo), {
		status: estado,
		headers: {
			...cabeceras,
			"Content-Type": "application/json",
			"X-Content-Type-Options": "nosniff",
		},
	});
}

/** Respuesta de error con la forma `{error, mensaje}`; `mensaje` es el texto para el administrador. */
export function responderError(
	estado: number,
	error: string,
	mensaje: string,
	cabeceras: Record<string, string> = {},
): Response {
	return responderJson(estado, { error, mensaje }, cabeceras);
}

/** Respuesta para un cuerpo que no se pudo leer (413 si es muy grande, 400 si no es JSON). */
export function responderCuerpoInvalido(
	motivo: "demasiado_grande" | "no_es_json",
	cabeceras: Record<string, string> = {},
): Response {
	return motivo === "demasiado_grande"
		? responderError(
				413,
				"cuerpo_demasiado_grande",
				"La solicitud es demasiado grande.",
				cabeceras,
			)
		: responderError(
				400,
				"datos_no_validos",
				"Revisa los campos del formulario.",
				cabeceras,
			);
}

/**
 * Respuesta de las rutas definidas en DT-01, sección 23, que todavía no se
 * construyen. Se responde solo después de comprobar el acceso de administrador.
 */
export function responderNoImplementado(
	cabeceras: Record<string, string> = {},
): Response {
	return responderError(
		501,
		"no_implementado",
		"Esta función todavía no está disponible.",
		cabeceras,
	);
}
