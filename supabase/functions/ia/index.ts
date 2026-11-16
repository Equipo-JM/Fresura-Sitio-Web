import { createClient } from "@supabase/supabase-js";
import { type ConjuntoClaves, crearVerificadorJwt } from "../_shared/acceso.ts";
import { crearLectorEntorno } from "../_shared/entorno.ts";
import { esquemaContenido } from "../_shared/esquemas/contenido.ts";
import { esquemaInstruccionGuion } from "../_shared/esquemas/guion.ts";
import {
	leerCuerpoJson,
	leerOrigenesPermitidos,
	responderCuerpoInvalido,
	responderError,
	responderJson,
	responderNoImplementado,
} from "../_shared/http.ts";
import { type ContextoRuta, crearServidor } from "../_shared/servidor.ts";
import { crearLlamadaGemini } from "./gemini.ts";
import { ErrorIa, generarGuion, RESPUESTAS_ERROR_IA } from "./generar.ts";
import {
	armarPromptGuion,
	datosDelProducto,
	fechaColombia,
} from "./instrucciones.ts";

// Función `ia` (DT-01, secciones 5 y 25). `POST /guion` (IF-09) está construida;
// `POST /prompt-video` (IF-10) ya tiene su ruta y su control de acceso, y
// responde 501 hasta que se implemente.

const entorno = crearLectorEntorno((nombre) => Deno.env.get(nombre));
const urlSupabase = entorno.obligatoria("SUPABASE_URL");
const clavePublicable = entorno.clavePorDefecto("SUPABASE_PUBLISHABLE_KEYS");
const modeloPrincipal = entorno.obligatoria("IA_MODELO");
const modeloRespaldo = entorno.obligatoria("IA_MODELO_RESPALDO");
const llamarGemini = crearLlamadaGemini(entorno.obligatoria("GEMINI_API_KEY"));

const opcionesAuth = { persistSession: false, autoRefreshToken: false };

// DD-20: el registro lleva fecha y tipo de error, nunca la clave ni el formulario.
function registrarFallo(tipo: string) {
	console.error(JSON.stringify({ fecha: new Date().toISOString(), tipo }));
}

async function generarGuionDesdePeticion({
	peticion,
	jwt,
	cors,
}: ContextoRuta): Promise<Response> {
	const cuerpo = await leerCuerpoJson(peticion);
	if (!cuerpo.valido) return responderCuerpoInvalido(cuerpo.motivo, cors);

	const instruccion = esquemaInstruccionGuion.safeParse(cuerpo.datos);
	if (!instruccion.success) {
		return responderError(
			400,
			"datos_no_validos",
			"Revisa los campos del formulario.",
			cors,
		);
	}

	// Se lee con el JWT del administrador, así aplica RLS (IF-17).
	const cliente = createClient(urlSupabase, clavePublicable, {
		auth: opcionesAuth,
		global: { headers: { Authorization: `Bearer ${jwt}` } },
	});
	const { data, error } = await cliente
		.from("versiones_contenido")
		.select("json")
		.eq("estado", "publicada")
		.maybeSingle();
	if (error) throw new Error("lectura_contenido");
	if (!data) {
		return responderError(
			409,
			"sin_publicada",
			"Primero publica el contenido del sitio.",
			cors,
		);
	}

	const contenido = esquemaContenido.safeParse(data.json);
	if (!contenido.success) throw new Error("contenido_no_valido");

	const producto = datosDelProducto(
		contenido.data,
		instruccion.data.producto_id,
		fechaColombia(new Date()),
	);
	if (!producto) {
		return responderError(
			404,
			"producto_no_encontrado",
			"Ese producto no existe o no está vigente.",
			cors,
		);
	}

	try {
		const resultado = await generarGuion({
			llamar: llamarGemini,
			modeloPrincipal,
			modeloRespaldo,
			prompt: armarPromptGuion(instruccion.data, producto),
			duracion: instruccion.data.duracion_s,
		});
		return responderJson(200, resultado, cors);
	} catch (error) {
		if (!(error instanceof ErrorIa)) throw error;
		registrarFallo(error.codigo);
		const { estado, mensaje } = RESPUESTAS_ERROR_IA[error.codigo];
		return responderError(estado, error.codigo, mensaje, cors);
	}
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
			guion: generarGuionDesdePeticion,
			// IF-10, DT-01 sección 25.4: pendiente de implementar.
			"prompt-video": async ({ cors }) => responderNoImplementado(cors),
		},
		mensajeSinPermiso: "Tu cuenta no tiene permiso para usar el agente.",
		mensajeErrorInterno:
			"No se pudo generar el guion. Inténtalo de nuevo en unos minutos.",
		registrarFallo,
	}),
);
