import type { SupabaseClient } from "@supabase/supabase-js";
import { esquemaContenido } from "../_shared/esquemas/contenido.ts";
import {
	esquemaPublicar,
	esquemaRestaurar,
} from "../_shared/esquemas/panel.ts";
import {
	leerCuerpoJson,
	responderCuerpoInvalido,
	responderError,
	responderJson,
} from "../_shared/http.ts";
import type { ContextoRuta, ManejadorRuta } from "../_shared/servidor.ts";
import { limpiarFotos } from "./limpiarFotos.ts";

/** Conecta las operaciones del panel con el cliente de permisos elevados. */
export function crearRutasPanel(
	cliente: SupabaseClient,
	registrarFallo: (tipo: string) => void,
): Record<string, ManejadorRuta> {
	return {
		publicar: protegerRuta("publicacion", (contexto) =>
			publicar(cliente, contexto, registrarFallo),
		),
		restaurar: protegerRuta("restauracion", (contexto) =>
			restaurar(cliente, contexto),
		),
	};
}

function protegerRuta(tipo: string, ruta: ManejadorRuta): ManejadorRuta {
	return async (contexto) => {
		try {
			return await ruta(contexto);
		} catch {
			// El servidor común registra el mensaje: nunca debe recibir errores crudos del cliente.
			throw new Error(tipo);
		}
	};
}

async function publicar(
	cliente: SupabaseClient,
	{ peticion, usuario, cors }: ContextoRuta,
	registrarFallo: (tipo: string) => void,
): Promise<Response> {
	const cuerpo = await leerCuerpoJson(peticion);
	if (!cuerpo.valido) return responderCuerpoInvalido(cuerpo.motivo, cors);
	const entrada = esquemaPublicar.safeParse(cuerpo.datos);
	if (!entrada.success) return datosInvalidos(cors);

	const { data: borrador, error } = await cliente
		.from("versiones_contenido")
		.select("id, revision, json")
		.eq("estado", "borrador")
		.maybeSingle();
	if (error) throw new Error("lectura_borrador");
	if (!borrador)
		return responderError(
			404,
			"sin_borrador",
			"No hay cambios por publicar.",
			cors,
		);
	let revision = entrada.data.revision;
	if (borrador.revision !== revision) return conflicto(cors);

	const json: unknown = borrador.json;
	const esObjeto =
		typeof json === "object" && json !== null && !Array.isArray(json);
	const cambiarEstado =
		entrada.data.contenido_real &&
		esObjeto &&
		(!("estado" in json) || json.estado !== "real");
	const contenido = esquemaContenido.safeParse(
		cambiarEstado ? { ...json, estado: "real" } : json,
	);
	if (!contenido.success) {
		const campos: Record<string, string> = {
			version_contrato: "la versión del contenido",
			estado: "la aprobación del contenido",
			categorias: "las categorías",
			negocio: "los datos del negocio y sus sedes",
			productos: "los productos y sus opciones",
			promociones: "las promociones y sus fechas",
			preguntas_frecuentes: "las preguntas frecuentes",
			opiniones: "las opiniones",
		};
		const campo = String(contenido.error.issues[0]?.path[0] ?? "");
		const etiqueta = Object.hasOwn(campos, campo)
			? campos[campo]
			: "los campos del contenido";
		return responderError(
			400,
			"contenido_no_valido",
			`Revisa ${etiqueta} antes de publicar. Hay datos incompletos o que no coinciden.`,
			cors,
		);
	}

	if (cambiarEstado) {
		const { data: guardado, error: errorGuardado } = await cliente
			.from("versiones_contenido")
			.update({ json: contenido.data })
			.eq("id", borrador.id)
			.eq("estado", "borrador")
			.eq("revision", revision)
			.select("revision")
			.maybeSingle();
		if (errorGuardado) throw new Error("guardar_borrador");
		if (!guardado) return conflicto(cors);
		revision = guardado.revision;
	}

	const { data: id, error: errorPublicar } = await cliente.rpc(
		"publicar_borrador",
		{
			revision_esperada: revision,
			usuario,
		},
	);
	if (
		errorPublicar?.code === "P0001" &&
		errorPublicar.message === "conflicto_borrador"
	)
		return conflicto(cors);
	if (errorPublicar || typeof id !== "string")
		throw new Error("publicar_borrador");
	const { data: publicada, error: errorLectura } = await cliente
		.from("versiones_contenido")
		.select("publicada_en")
		.eq("id", id)
		.single();
	if (errorLectura || typeof publicada?.publicada_en !== "string")
		throw new Error("lectura_publicada");
	try {
		await limpiarFotos(cliente);
	} catch {
		// Storage queda fuera de la transacción; se reintenta al volver a publicar.
		registrarFallo("limpieza_fotos");
	}
	return responderJson(200, { publicada_en: publicada.publicada_en }, cors);
}

async function restaurar(
	cliente: SupabaseClient,
	{ peticion, cors }: ContextoRuta,
): Promise<Response> {
	const cuerpo = await leerCuerpoJson(peticion);
	if (!cuerpo.valido) return responderCuerpoInvalido(cuerpo.motivo, cors);
	if (!esquemaRestaurar.safeParse(cuerpo.datos).success)
		return datosInvalidos(cors);
	const { error } = await cliente.rpc("restaurar_anterior");
	if (error?.code === "P0001" && error.message === "sin_anterior") {
		return responderError(
			404,
			"sin_anterior",
			"No hay una versión anterior para restaurar.",
			cors,
		);
	}
	if (error) throw new Error("restaurar_anterior");
	const { data, error: errorLectura } = await cliente
		.from("versiones_contenido")
		.select("publicada_en")
		.eq("estado", "publicada")
		.single();
	if (errorLectura || typeof data?.publicada_en !== "string")
		throw new Error("lectura_publicada");
	return responderJson(200, { publicada_en: data.publicada_en }, cors);
}

function datosInvalidos(cors: Record<string, string>): Response {
	return responderError(
		400,
		"datos_no_validos",
		"Revisa los campos del formulario.",
		cors,
	);
}

function conflicto(cors: Record<string, string>): Response {
	return responderError(
		409,
		"conflicto_borrador",
		"Alguien más cambió este contenido. Recarga para ver la última versión.",
		cors,
	);
}
