import { createClient } from "@supabase/supabase-js";
import { type ConjuntoClaves, crearVerificadorJwt } from "../_shared/acceso.ts";
import { crearLectorEntorno } from "../_shared/entorno.ts";
import { leerOrigenesPermitidos } from "../_shared/http.ts";
import { crearServidor } from "../_shared/servidor.ts";
import { crearRutasPanel } from "./rutas.ts";

/**
 * Función `panel` (DT-01, secciones 4, 21.1 y 23): publica el borrador validado
 * con control de revisión (IF-07) y restaura la versión anterior (IF-08).
 * Las operaciones usan permisos de service_role tras comprobar admin con aal2;
 * la clave secreta permanece dentro de la función (DD-04).
 */

const entorno = crearLectorEntorno((nombre) => Deno.env.get(nombre));
const urlSupabase = entorno.obligatoria("SUPABASE_URL");
const clavePublicable = entorno.clavePorDefecto("SUPABASE_PUBLISHABLE_KEYS");
const opcionesAuth = { persistSession: false, autoRefreshToken: false };
const clienteServicio = createClient(
	urlSupabase,
	entorno.clavePorDefecto("SUPABASE_SECRET_KEYS"),
	{ auth: opcionesAuth },
);

// DD-20: el registro lleva fecha y tipo de error, nunca claves ni contenido.
function registrarFallo(tipo: string) {
	console.error(JSON.stringify({ fecha: new Date().toISOString(), tipo }));
}

Deno.serve(
	crearServidor({
		origenesPermitidos: leerOrigenesPermitidos(
			entorno.opcional("ORIGENES_PERMITIDOS"),
		),
		verificarJwt: crearVerificadorJwt(
			createClient(urlSupabase, clavePublicable, { auth: opcionesAuth }),
			entorno.json("SUPABASE_JWKS") as ConjuntoClaves,
		),
		rutas: crearRutasPanel(clienteServicio),
		mensajeSinPermiso: "Tu cuenta no tiene permiso para usar el panel.",
		mensajeErrorInterno: "No se pudo publicar. El sitio sigue igual.",
		registrarFallo,
	}),
);
