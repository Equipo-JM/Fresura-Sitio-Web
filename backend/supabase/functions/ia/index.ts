import { createClient } from "@supabase/supabase-js";
import { type ConjuntoClaves, crearVerificadorJwt } from "../_shared/acceso.ts";
import { crearLectorEntorno } from "../_shared/entorno.ts";
import { leerOrigenesPermitidos } from "../_shared/http.ts";
import { crearServidor } from "../_shared/servidor.ts";
import { crearProveedorDid, type PerfilDid } from "./proveedor/did.ts";
import { crearLlamadaGemini } from "./proveedor/gemini.ts";
import { datosRegistroFallo } from "./proveedor/generar.ts";
import { crearRutaChat } from "./skills/chat.ts";
import { crearRutaGuion } from "./skills/guion.ts";
import { crearRutaPromptVideo } from "./skills/prompt-video.ts";
import { crearRutaEstadoVideo } from "./skills/video-did.ts";

// Solo cableado: entorno, proveedor y rutas. Cada ruta es una skill en `skills/`
// y la llamada a Gemini con su cadena de modelos está en `proveedor/`.

const entorno = crearLectorEntorno((nombre) => Deno.env.get(nombre));
const urlSupabase = entorno.obligatoria("SUPABASE_URL");
const clavePublicable = entorno.clavePorDefecto("SUPABASE_PUBLISHABLE_KEYS");
const modeloPrincipal = entorno.obligatoria("IA_MODELO");
const modeloRespaldo = entorno.obligatoria("IA_MODELO_RESPALDO");
const claveGemini = entorno.obligatoria("GEMINI_API_KEY");
const llamarGemini = crearLlamadaGemini(claveGemini);

const opcionesAuth = { persistSession: false, autoRefreshToken: false };

const claveDid = entorno.opcional("DID_API_KEY");
const imagenDid = entorno.opcional("DID_AVATAR_IMAGE_URL");
const vozDid = entorno.opcional("DID_VOICE_ID");
const avatarDid = entorno.opcional("DID_AVATAR_ID");
const sentimientoDid = entorno.opcional("DID_SENTIMENT_ID");
const modeloVozDid = entorno.opcional("DID_VOICE_MODEL_ID");
const fondoDid = entorno.opcional("DID_BACKGROUND_URL");
const esUrlHttps = (valor: string | undefined): valor is string =>
	!!valor && URL.canParse(valor) && new URL(valor).protocol === "https:";

let perfilDid: PerfilDid | undefined;
if (avatarDid || sentimientoDid || modeloVozDid) {
	if (avatarDid && sentimientoDid && vozDid && modeloVozDid)
		perfilDid = {
			tipo: "expresivo",
			avatar: avatarDid,
			sentimiento: sentimientoDid,
			voz: vozDid,
			modeloVoz: modeloVozDid,
			...(esUrlHttps(fondoDid) ? { fondo: fondoDid } : {}),
		};
} else if (imagenDid && vozDid && esUrlHttps(imagenDid)) {
	perfilDid = { tipo: "foto", imagen: imagenDid, voz: vozDid };
}

const videoDid =
	claveDid && perfilDid
		? {
				cliente: () =>
					createClient(
						urlSupabase,
						entorno.clavePorDefecto("SUPABASE_SECRET_KEYS"),
						{ auth: opcionesAuth },
					),
				proveedor: crearProveedorDid({ clave: claveDid, perfil: perfilDid }),
			}
		: undefined;

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
			chat: crearRutaChat({
				...opcionesRuta,
				claveGemini,
				videoDid,
				modeloAgente: entorno.opcional("IA_MODELO_AGENTE") ?? modeloPrincipal,
			}),
			"estado-video": crearRutaEstadoVideo({
				crearCliente: opcionesRuta.crearCliente,
				videoDid,
			}),
			guion: crearRutaGuion(opcionesRuta),
			"prompt-video": crearRutaPromptVideo(opcionesRuta),
		},
		mensajeSinPermiso: "Tu cuenta no tiene permiso para usar el agente.",
		mensajeErrorInterno:
			"No se pudo generar el guion. Inténtalo de nuevo en unos minutos.",
		registrarFallo,
	}),
);
