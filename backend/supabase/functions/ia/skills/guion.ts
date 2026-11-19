import type { SupabaseClient } from "@supabase/supabase-js";
import { esquemaContenido } from "../../_shared/esquemas/contenido.ts";
import { esquemaInstruccionGuionProducto } from "../../_shared/esquemas/guion.ts";
import {
	leerCuerpoJson,
	responderCuerpoInvalido,
	responderError,
	responderJson,
} from "../../_shared/http.ts";
import type { ManejadorRuta } from "../../_shared/servidor.ts";
import {
	datosRegistroFallo,
	ErrorIa,
	generarGuion,
	type LlamarModelo,
	RESPUESTAS_ERROR_IA,
} from "../proveedor/generar.ts";
import {
	armarPromptGuion,
	datosDelProducto,
	fechaColombia,
} from "./instrucciones.ts";

/** Dependencias de generación y acceso a datos con el JWT del administrador. */
export type OpcionesRutaGuion = {
	crearCliente: (jwt: string) => SupabaseClient;
	llamar: LlamarModelo;
	modeloPrincipal: string;
	modeloRespaldo: string;
};

/**
 * Atiende `POST /guion` (IF-09): valida la instrucción, lee la versión
 * publicada con el JWT del administrador (RLS, IF-17) y genera el guion con
 * los datos del producto vigente. No guarda nada: guardar es del administrador.
 */
export function crearRutaGuion(opciones: OpcionesRutaGuion): ManejadorRuta {
	return async ({ peticion, jwt, cors }) => {
		const cuerpo = await leerCuerpoJson(peticion);
		if (!cuerpo.valido) return responderCuerpoInvalido(cuerpo.motivo, cors);

		const instruccion = esquemaInstruccionGuionProducto.safeParse(cuerpo.datos);
		if (!instruccion.success) {
			return responderError(
				400,
				"datos_no_validos",
				"Revisa los campos del formulario.",
				cors,
			);
		}

		const { data, error } = await opciones
			.crearCliente(jwt)
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
				llamar: opciones.llamar,
				modeloPrincipal: opciones.modeloPrincipal,
				modeloRespaldo: opciones.modeloRespaldo,
				prompt: armarPromptGuion(instruccion.data, producto),
				duracion: instruccion.data.duracion_s,
			});
			return responderJson(200, resultado, cors);
		} catch (error) {
			if (!(error instanceof ErrorIa)) throw error;
			// DD-20: fecha, tipo y código HTTP del proveedor; nunca su mensaje ni el formulario.
			console.error(
				JSON.stringify(datosRegistroFallo(error.codigo, error.estadoProveedor)),
			);
			const { estado, mensaje } = RESPUESTAS_ERROR_IA[error.codigo];
			return responderError(estado, error.codigo, mensaje, cors);
		}
	};
}
