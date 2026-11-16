import { createClient } from "@supabase/supabase-js";
import { type ConjuntoClaves, crearVerificadorJwt } from "../_shared/acceso.ts";
import { crearLectorEntorno } from "../_shared/entorno.ts";
import {
	leerOrigenesPermitidos,
	responderNoImplementado,
} from "../_shared/http.ts";
import { crearServidor } from "../_shared/servidor.ts";

// Función `panel` (DT-01, secciones 4, 21.1 y 23). Base lista: CORS, control de
// acceso (admin con aal2) y las dos rutas, que responden 501 hasta implementarse.
//
// Al implementarlas (IF-07 e IF-08):
// - `POST /publicar` recibe `{revision, contenido_real}`, valida el borrador con
//   `esquemaContenido` (incluye RC-1 a RC-8) y llama a `publicar_borrador`.
// - `POST /restaurar` recibe `{}` y llama a `restaurar_anterior`.
// - Las dos funciones de la base solo las ejecuta `service_role`: el cliente se
//   crea con la clave `default` de `SUPABASE_SECRET_KEYS`, que Supabase pone en
//   el entorno de la función (DD-04). Esa clave nunca sale de aquí.

const entorno = crearLectorEntorno((nombre) => Deno.env.get(nombre));
const urlSupabase = entorno.obligatoria("SUPABASE_URL");
const clavePublicable = entorno.clavePorDefecto("SUPABASE_PUBLISHABLE_KEYS");

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
			createClient(urlSupabase, clavePublicable, {
				auth: { persistSession: false, autoRefreshToken: false },
			}),
			entorno.json("SUPABASE_JWKS") as ConjuntoClaves,
		),
		rutas: {
			publicar: async ({ cors }) => responderNoImplementado(cors),
			restaurar: async ({ cors }) => responderNoImplementado(cors),
		},
		mensajeSinPermiso: "Tu cuenta no tiene permiso para usar el panel.",
		mensajeErrorInterno: "No se pudo publicar. El sitio sigue igual.",
		registrarFallo,
	}),
);
