import { createClient } from "@supabase/supabase-js";
import {
	comprobarAdministrador,
	crearVerificadorJwt,
} from "../_shared/acceso.ts";
import { esquemaContenido } from "../_shared/esquemas/contenido.ts";
import { esquemaInstruccionGuion } from "../_shared/esquemas/guion.ts";
import {
	cabecerasCors,
	leerOrigenesPermitidos,
	responderError,
	responderJson,
} from "../_shared/http.ts";
import { crearLlamadaGemini } from "./gemini.ts";
import { ErrorIa, generarGuion, RESPUESTAS_ERROR_IA } from "./generar.ts";
import {
	armarPromptGuion,
	datosDelProducto,
	fechaColombia,
} from "./instrucciones.ts";

// Función `ia` (DT-01, secciones 5 y 25; IF-09). Por ahora atiende `POST /guion`;
// `POST /prompt-video` (IF-10) se agrega en el siguiente paso.

function variable(nombre: string): string {
	const valor = Deno.env.get(nombre);
	if (!valor) throw new Error(`Falta la variable ${nombre}`);
	return valor;
}

const urlSupabase = variable("SUPABASE_URL");
const clavePublicable: string = JSON.parse(
	variable("SUPABASE_PUBLISHABLE_KEYS"),
).default;
const origenesPermitidos = leerOrigenesPermitidos(
	Deno.env.get("ORIGENES_PERMITIDOS"),
);
const modeloPrincipal = variable("IA_MODELO");
const modeloRespaldo = variable("IA_MODELO_RESPALDO");
const llamarGemini = crearLlamadaGemini(variable("GEMINI_API_KEY"));

const opcionesAuth = { persistSession: false, autoRefreshToken: false };
const verificarJwt = crearVerificadorJwt(
	createClient(urlSupabase, clavePublicable, { auth: opcionesAuth }),
	JSON.parse(variable("SUPABASE_JWKS")),
);

// DD-20: el registro lleva fecha y tipo de error, nunca la clave ni el formulario.
function registrarFallo(tipo: string) {
	console.error(JSON.stringify({ fecha: new Date().toISOString(), tipo }));
}

Deno.serve(async (peticion) => {
	const cors = cabecerasCors(
		peticion.headers.get("Origin"),
		origenesPermitidos,
	);
	if (cors === null) {
		return responderError(403, "origen_no_permitido", "Origen no permitido.");
	}
	if (peticion.method === "OPTIONS") {
		return new Response(null, { status: 204, headers: cors });
	}

	const ruta = new URL(peticion.url).pathname;
	if (peticion.method !== "POST" || !ruta.endsWith("/guion")) {
		return responderError(404, "no_encontrado", "Ruta no encontrada.", cors);
	}

	const acceso = await comprobarAdministrador(
		peticion.headers.get("Authorization"),
		verificarJwt,
	);
	if (!acceso.permitido) {
		return acceso.estado === 401
			? responderError(
					401,
					"sin_sesion",
					"Tu sesión terminó. Vuelve a iniciar sesión.",
					cors,
				)
			: responderError(
					403,
					"sin_permiso",
					"Tu cuenta no tiene permiso para usar el agente.",
					cors,
				);
	}

	try {
		return await generarGuionDesdePeticion(peticion, acceso.jwt, cors);
	} catch (error) {
		// Los errores propios llevan su tipo en el mensaje (p. ej. "lectura_contenido").
		registrarFallo(error instanceof Error ? error.message : "desconocido");
		return responderError(
			500,
			"error_interno",
			"No se pudo generar el guion. Inténtalo de nuevo en unos minutos.",
			cors,
		);
	}
});

async function generarGuionDesdePeticion(
	peticion: Request,
	jwt: string,
	cors: Record<string, string>,
): Promise<Response> {
	const cuerpo: unknown = await peticion.json().catch(() => undefined);
	const instruccion = esquemaInstruccionGuion.safeParse(cuerpo);
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
