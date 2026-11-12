/**
 * Utilidades HTTP comunes de las funciones `panel` e `ia`: orígenes permitidos
 * (CORS) y respuestas JSON con la forma de error `{error, mensaje}` (DT-01, sección 23).
 */

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
		Vary: "Origin",
	};
}

/** Respuesta JSON con las cabeceras dadas. */
export function responderJson(
	estado: number,
	cuerpo: unknown,
	cabeceras: Record<string, string> = {},
): Response {
	return new Response(JSON.stringify(cuerpo), {
		status: estado,
		headers: { ...cabeceras, "Content-Type": "application/json" },
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
