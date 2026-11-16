/**
 * Lectura de las variables de entorno de las funciones `panel` e `ia`
 * (DT-01, sección 26). Recibe la función que lee el entorno, en vez de usar
 * `Deno.env` directamente, para poder probarse con Vitest.
 */

/** Lee una variable por nombre; `undefined` si no existe. */
export type ObtenerVariable = (nombre: string) => string | undefined;

/** Lector de variables con las comprobaciones que comparten las funciones. */
export type LectorEntorno = {
	/** Valor de una variable obligatoria. @throws si falta o está vacía. */
	obligatoria(nombre: string): string;
	/** Valor de una variable opcional, o `undefined`. */
	opcional(nombre: string): string | undefined;
	/**
	 * Clave `default` de un diccionario JSON de claves de Supabase, como
	 * `SUPABASE_PUBLISHABLE_KEYS` o `SUPABASE_SECRET_KEYS` (`{"default": "..."}`).
	 * @throws si falta, no es JSON o no tiene la clave `default`.
	 */
	clavePorDefecto(nombre: string): string;
	/** Variable obligatoria con JSON, ya interpretado. @throws si falta o no es JSON. */
	json(nombre: string): unknown;
};

/** Crea el lector de variables a partir de `Deno.env.get` o de un doble de pruebas. */
export function crearLectorEntorno(obtener: ObtenerVariable): LectorEntorno {
	const obligatoria = (nombre: string): string => {
		const valor = obtener(nombre);
		if (!valor) throw new Error(`Falta la variable ${nombre}`);
		return valor;
	};

	const json = (nombre: string): unknown => {
		try {
			return JSON.parse(obligatoria(nombre));
		} catch (error) {
			if (error instanceof SyntaxError) {
				throw new Error(`La variable ${nombre} no es JSON válido`);
			}
			throw error;
		}
	};

	return {
		obligatoria,
		opcional: (nombre) => obtener(nombre) || undefined,
		json,
		clavePorDefecto(nombre) {
			const diccionario = json(nombre);
			const clave =
				typeof diccionario === "object" && diccionario !== null
					? (diccionario as Record<string, unknown>).default
					: undefined;
			if (typeof clave !== "string" || clave === "") {
				throw new Error(`La variable ${nombre} no tiene la clave "default"`);
			}
			return clave;
		},
	};
}
