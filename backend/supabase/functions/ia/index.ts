import { createClient } from "@supabase/supabase-js";
import { type ConjuntoClaves, crearVerificadorJwt } from "../_shared/acceso.ts";
import { crearLectorEntorno } from "../_shared/entorno.ts";
import { leerOrigenesPermitidos } from "../_shared/http.ts";
import { crearServidor } from "../_shared/servidor.ts";
import { crearLlamadaGemini } from "./proveedor/gemini.ts";
import { datosRegistroFallo } from "./proveedor/generar.ts";
import { crearRutaGuion } from "./skills/guion.ts";
import { crearRutaPromptVideo } from "./skills/prompt-video.ts";

// Solo cableado: entorno, proveedor y rutas. Cada ruta es una skill en `skills/`
// y la llamada a Gemini con su cadena de modelos está en `proveedor/`.

const entorno = crearLectorEntorno((nombre) => Deno.env.get(nombre));
const urlSupabase = entorno.obligatoria("SUPABASE_URL");
const clavePublicable = entorno.clavePorDefecto("SUPABASE_PUBLISHABLE_KEYS");
const modeloPrincipal = entorno.obligatoria("IA_MODELO");
const modeloRespaldo = entorno.obligatoria("IA_MODELO_RESPALDO");
const llamarGemini = crearLlamadaGemini(entorno.obligatoria("GEMINI_API_KEY"));

const opcionesAuth = { persistSession: false, autoRefreshToken: false };

// Ambas rutas usan el JWT del administrador para que las lecturas y escrituras apliquen RLS.
const opcionesRuta = {
	crearCliente: (jwt: string) =>
		createClient(urlSupabase, clavePublicable, {
			auth: opcionesAuth,
			global: { headers: { Authorization: `Bearer ${jwt}` } },
		}),
	llamar: llamarGemini,
	modeloPrincipal,
	modeloRespaldo,
};

// DD-20: el registro lleva fecha y tipo de error, nunca la clave ni el formulario.
function registrarFallo(tipo: string) {
	console.error(JSON.stringify(datosRegistroFallo(tipo)));
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
		rutas: {
			guion: crearRutaGuion(opcionesRuta),
			"prompt-video": crearRutaPromptVideo(opcionesRuta),
		},
		mensajeSinPermiso: "Tu cuenta no tiene permiso para usar el agente.",
		mensajeErrorInterno:
			"No se pudo generar el guion. Inténtalo de nuevo en unos minutos.",
		registrarFallo,
	}),
);
