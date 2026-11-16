/** Pantalla del acceso que corresponde a la sesión actual. */
export type EstadoAcceso =
	| "sin-sesion"
	| "registrar-codigo"
	| "pedir-codigo"
	| "sin-permiso"
	| "dentro";

/** Lo que se sabe de la sesión para decidir la pantalla. */
export type DatosSesion = {
	haySesion: boolean;
	/** Nivel actual: `aal1` solo con contraseña, `aal2` con el código. */
	nivel: string | null;
	/** Factores TOTP ya verificados (la app autenticadora registrada). */
	factoresVerificados: number;
	/** `app_metadata.rol` del usuario. */
	rol: unknown;
};

/**
 * Decide qué pantalla mostrar. Sin la app registrada se pide registrarla con
 * el código QR (IF-15); con la app pero sin el código, se pide el código
 * (IF-03). Con `aal2` solo entra el rol `admin`, igual que `es_admin()` en la
 * base: si no, la sesión sirve para nada y se muestra «sin permiso».
 */
export function estadoAcceso(datos: DatosSesion): EstadoAcceso {
	if (!datos.haySesion) return "sin-sesion";
	if (datos.nivel !== "aal2") {
		return datos.factoresVerificados > 0 ? "pedir-codigo" : "registrar-codigo";
	}
	return datos.rol === "admin" ? "dentro" : "sin-permiso";
}

/** Mensaje genérico de inicio de sesión fallido: no dice qué dato falló (DT-01, sección 6). */
export const MENSAJE_ACCESO_FALLIDO =
	"No pudimos iniciar sesión. Revisa tu correo y tu contraseña, y vuelve a intentarlo.";
