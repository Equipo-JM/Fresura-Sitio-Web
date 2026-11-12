import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Control de acceso de las funciones `panel` e `ia`: solo entra una sesión con
 * rol `admin` en `app_metadata` y segundo paso completado (`aal2`). Sin token o
 * con un token inválido, 401; con sesión pero sin esos requisitos, 403
 * (DT-01, secciones 6 y 23; DD-04).
 */

/** Datos del JWT de Supabase que usa el control de acceso. */
export type ClaimsSesion = {
	sub?: string;
	aal?: string;
	app_metadata?: { rol?: unknown };
};

/** Verifica la firma y la vigencia de un JWT; devuelve sus datos o `null` si no vale. */
export type VerificarJwt = (jwt: string) => Promise<ClaimsSesion | null>;

/** Resultado de comprobar el acceso. Si se permite, incluye el JWT para leer con RLS. */
export type ResultadoAcceso =
	| { permitido: true; usuario: string; jwt: string }
	| { permitido: false; estado: 401 | 403 };

type OpcionesClaims = NonNullable<
	Parameters<SupabaseClient["auth"]["getClaims"]>[1]
>;

/** Claves públicas con las que Supabase firma los JWT (`SUPABASE_JWKS`). */
export type ConjuntoClaves = NonNullable<OpcionesClaims["jwks"]>;

/** Extrae el token de una cabecera `Authorization: Bearer <token>`. */
export function leerJwt(autorizacion: string | null): string | null {
	const coincidencia = /^Bearer\s+(\S+)$/i.exec(autorizacion ?? "");
	return coincidencia ? coincidencia[1] : null;
}

/** Igual que `public.es_admin()` en la base: rol `admin` y nivel `aal2`. */
export function esAdministrador(claims: ClaimsSesion): boolean {
	return claims.app_metadata?.rol === "admin" && claims.aal === "aal2";
}

/** Decide si la petición puede usar la función. */
export async function comprobarAdministrador(
	autorizacion: string | null,
	verificar: VerificarJwt,
): Promise<ResultadoAcceso> {
	const jwt = leerJwt(autorizacion);
	if (jwt === null) return { permitido: false, estado: 401 };

	const claims = await verificar(jwt);
	if (claims === null || typeof claims.sub !== "string") {
		return { permitido: false, estado: 401 };
	}
	if (!esAdministrador(claims)) return { permitido: false, estado: 403 };

	return { permitido: true, usuario: claims.sub, jwt };
}

/**
 * Verificador basado en `supabase.auth.getClaims`, con las claves de
 * `SUPABASE_JWKS`: comprueba la firma en la función, como pide DD-04, porque
 * `verify_jwt` no autentica.
 */
export function crearVerificadorJwt(
	cliente: SupabaseClient,
	jwks: ConjuntoClaves,
): VerificarJwt {
	return async (jwt) => {
		try {
			const { data, error } = await cliente.auth.getClaims(jwt, { jwks });
			if (error || !data) return null;
			return data.claims as ClaimsSesion;
		} catch {
			// Con un token mal formado, getClaims lanza en vez de devolver el error.
			return null;
		}
	};
}
