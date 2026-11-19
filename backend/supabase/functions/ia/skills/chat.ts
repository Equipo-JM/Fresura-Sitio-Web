import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
	createUIMessageStream,
	createUIMessageStreamResponse,
	isStepCount,
	type ModelMessage,
	streamText,
	wrapLanguageModel,
} from "ai";
import {
	ENLACE_VIDEO_DID,
	esquemaChat,
	esTituloProvisional,
	tituloConversacion,
} from "../../_shared/esquemas/chat.ts";
import { esquemaContenido } from "../../_shared/esquemas/contenido.ts";
import {
	leerCuerpoJson,
	responderCuerpoInvalido,
	responderError,
} from "../../_shared/http.ts";
import type { ManejadorRuta } from "../../_shared/servidor.ts";
import {
	crearHerramientasAgente,
	type EstadoAgente,
	INSTRUCCIONES_AGENTE,
	MAXIMO_PASOS_AGENTE,
} from "../agente/agente.ts";
import {
	cargarMensajes,
	guardarMensajes,
	leerConversacion,
} from "../agente/memoria.ts";
import {
	preciosPublicados,
	validarTextoContraDatos,
} from "../agente/validadores.ts";
import {
	clasificarErrorProveedor,
	datosRegistroFallo,
	ErrorIa,
	RESPUESTAS_ERROR_IA,
} from "../proveedor/generar.ts";
import { fechaColombia } from "./instrucciones.ts";
import {
	accionVideoDid,
	procesarVideoDid,
	type VideoDid,
} from "./video-did.ts";

/** Dependencias con RLS y proveedor sustituible para probar el flujo sin conexiones externas. */
export type OpcionesRutaChat = {
	crearCliente: (jwt: string) => SupabaseClient;
	claveGemini: string;
	modeloAgente: string;
	modeloRespaldo: string;
	crearModelo?: (id: string) => ModeloBase;
	videoDid?: VideoDid;
};

/** Modelo que acepta el envoltorio del SDK (el de Google y los simulados de las pruebas). */
type ModeloBase = Parameters<typeof wrapLanguageModel>[0]["model"];

function clasificarFallo(error: unknown): ErrorIa {
	const estado =
		typeof error === "object" &&
		error !== null &&
		"statusCode" in error &&
		typeof error.statusCode === "number"
			? error.statusCode
			: undefined;
	return new ErrorIa(
		clasificarErrorProveedor({
			status: estado,
			toString: () => (error instanceof Error ? error.message : ""),
		}),
		estado,
	);
}

/**
 * POST /chat (IF-20). El chunk finish lleva messageMetadata.tarjetaGuion =
 * {instruccion, guion}, messageMetadata.piezas = las piezas de `entregar_pieza`
 * y messageMetadata.aviso = {tipo, mensaje} cuando el texto
 * contiene precios o nombres explícitos de sedes no publicados. El panel debe leer ambos en message.metadata.
 * Cada paso del agente pasa al modelo de respaldo si el principal responde 503
 * o cupo agotado, aunque la respuesta ya haya empezado (ver `modeloConRespaldo`).
 */
/**
 * Envuelve el modelo principal para que cada llamada (cada paso del bucle de
 * herramientas) pase una vez al modelo de respaldo ante un 503 o cupo agotado.
 * El 17 nov Gemini respondió 503 en un paso intermedio, ya con herramientas
 * usadas, y el turno se perdía porque el respaldo solo cubría el primer paso.
 */
export function modeloConRespaldo(
	principal: ModeloBase,
	crearRespaldo: () => ModeloBase,
	registrar: (tipo: string, estado?: number) => void,
) {
	return wrapLanguageModel({
		model: principal,
		middleware: {
			wrapStream: async ({ doStream, params }) => {
				try {
					return await doStream();
				} catch (error) {
					const fallo = clasificarFallo(error);
					if (fallo.codigo !== "ia_cupo" && fallo.estadoProveedor !== 503)
						throw error;
					registrar(fallo.codigo, fallo.estadoProveedor);
					return wrapLanguageModel({
						model: crearRespaldo(),
						middleware: {},
					}).doStream(params);
				}
			},
		},
	});
}

export function crearRutaChat(opciones: OpcionesRutaChat): ManejadorRuta {
	const crearModelo =
		opciones.crearModelo ??
		createGoogleGenerativeAI({ apiKey: opciones.claveGemini });
	return async ({ peticion, jwt, cors }) => {
		const cuerpo = await leerCuerpoJson(peticion);
		if (!cuerpo.valido) return responderCuerpoInvalido(cuerpo.motivo, cors);
		const entrada = esquemaChat.safeParse(cuerpo.datos);
		if (!entrada.success)
			return responderError(
				400,
				"datos_no_validos",
				"Revisa el mensaje e inténtalo de nuevo.",
				cors,
			);
		const { conversacion_id: id, mensaje } = entrada.data;
		const cliente = opciones.crearCliente(jwt);
		const conversacion = await leerConversacion(cliente, id);
		if (!conversacion)
			return responderError(
				404,
				"conversacion_no_encontrada",
				"Esa conversación no existe.",
				cors,
			);
		const accion = accionVideoDid(mensaje);
		if (accion) {
			const historial =
				accion === "preparar" && opciones.videoDid
					? await cargarMensajes(cliente, id)
					: [];
			const texto = await procesarVideoDid(
				accion,
				id,
				historial,
				opciones.videoDid,
			);
			await guardarMensajes(cliente, id, [
				{ role: "user", content: mensaje },
				{ role: "assistant", content: texto },
			]);
			const flujo = createUIMessageStream({
				execute: ({ writer }) => {
					const idTexto = crypto.randomUUID();
					writer.write({ type: "start", messageId: crypto.randomUUID() });
					writer.write({ type: "text-start", id: idTexto });
					writer.write({ type: "text-delta", id: idTexto, delta: texto });
					writer.write({ type: "text-end", id: idTexto });
					writer.write({ type: "finish", finishReason: "stop" });
				},
			});
			return createUIMessageStreamResponse({ stream: flujo, headers: cors });
		}
		const { data, error } = await cliente
			.from("versiones_contenido")
			.select("json")
			.eq("estado", "publicada")
			.maybeSingle();
		if (error) throw new Error("lectura_contenido");
		if (!data)
			return responderError(
				409,
				"sin_publicada",
				"Primero publica el contenido del sitio.",
				cors,
			);
		const contenido = esquemaContenido.safeParse(data.json);
		if (!contenido.success) throw new Error("contenido_no_valido");
		const historial = await cargarMensajes(cliente, id);
		const nuevo: ModelMessage = { role: "user", content: mensaje };
		await guardarMensajes(cliente, id, [nuevo]);
		const estado: EstadoAgente = {
			productosConsultados: new Set(),
		};
		const hoy = fechaColombia(new Date());
		const herramientas = crearHerramientasAgente(contenido.data, hoy, estado);
		const instrucciones = [
			INSTRUCCIONES_AGENTE,
			// El calendario y las fechas especiales se cuentan desde hoy en Colombia.
			`Hoy es ${hoy} (hora de Colombia).`,
			...(contenido.data.estado === "ejemplo"
				? [
						"La versión publicada es de ejemplo. Puedes usarla para la demo. Si el guion se apoya en estos datos, avisa a la persona administradora en el chat para que los verifique antes de usar el guion.",
					]
				: []),
			...(opciones.videoDid
				? [
						"Cuando la persona quiera convertir un guion en video con Presentadora Fresura, indícale que escriba «crear video». El chat pedirá «confirmar video» y después mostrará el enlace por sí solo cuando el video esté listo; no hace falta escribir nada más. El render usa D-ID. Nunca afirmes haber dejado un trabajo en cola ni inventes un enlace.",
					]
				: []),
		].join("\n\n");
		const flujo = createUIMessageStream({
			onError: () => RESPUESTAS_ERROR_IA.ia_tiempo.mensaje,
			execute: async ({ writer }) => {
				writer.write({ type: "start", messageId: crypto.randomUUID() });
				let fallo: unknown;
				let texto = "";
				const resultado = streamText({
					model: modeloConRespaldo(
						crearModelo(opciones.modeloAgente),
						() => crearModelo(opciones.modeloRespaldo),
						(tipo, estadoProveedor) =>
							console.error(
								JSON.stringify(datosRegistroFallo(tipo, estadoProveedor)),
							),
					),
					system: instrucciones,
					messages: [
						...historial.map((m) =>
							m.role === "assistant" &&
							typeof m.content === "string" &&
							m.content.startsWith(ENLACE_VIDEO_DID)
								? {
										role: "assistant" as const,
										content:
											"El video está listo. Para renovar el enlace escribe «estado del video».",
									}
								: m,
						),
						nuevo,
					],
					tools: herramientas,
					stopWhen: isStepCount(MAXIMO_PASOS_AGENTE),
					// Sin reintentos del SDK: el 503 y el cupo los atiende `modeloConRespaldo`,
					// y reintentar con los dos modelos caídos solo gastaría cupo.
					maxRetries: 0,
					// Un turno encadena hasta MAXIMO_PASOS_AGENTE llamadas y, con Gemini saturado,
					// el 17 nov tardó 46 s antes de un 503; 100 s deja espacio al respaldo dentro
					// de los 150 s de la Edge Function (DT-01, sección 11).
					abortSignal: AbortSignal.timeout(100_000),
					onError: ({ error }) => {
						fallo = error;
					},
					onFinish: async ({ responseMessages }) => {
						if (fallo !== undefined) return;
						await guardarMensajes(cliente, id, responseMessages);
						const entrega = estado.guionEntregado;
						if (!entrega || esTituloProvisional(entrega.guion.titulo)) return;
						const titulo = tituloConversacion(entrega.guion.titulo);
						if (titulo === conversacion.titulo) return;
						const { error } = await cliente
							.from("agente_conversaciones")
							.update({ titulo })
							.eq("id", id)
							.eq("titulo", conversacion.titulo);
						if (error)
							console.error(
								JSON.stringify(
									datosRegistroFallo("escritura_titulo_conversacion"),
								),
							);
					},
				});
				const lector = resultado
					.toUIMessageStream({
						sendStart: false,
						onError: () => "error_proveedor",
					})
					.getReader();
				try {
					while (true) {
						const { done, value: parte } = await lector.read();
						if (done) break;
						if (parte.type === "error") {
							fallo ??= new Error("fallo_flujo");
							continue;
						}
						if (fallo !== undefined) continue;
						if (parte.type === "text-delta") texto += parte.delta;
						if (parte.type === "finish") {
							const errores = validarTextoContraDatos(
								texto,
								preciosPublicados(contenido.data),
								contenido.data.negocio.sedes.map((sede) => sede.nombre),
							);
							const tipoAviso = errores.some((error) =>
								error.startsWith("La sede"),
							)
								? "sede_no_publicada"
								: "precio_no_publicado";
							if (errores.length)
								console.error(JSON.stringify(datosRegistroFallo(tipoAviso)));
							const entrega = estado.guionEntregado;
							writer.write({
								...parte,
								messageMetadata: {
									...(entrega
										? {
												tarjetaGuion: {
													instruccion: entrega.instruccion,
													guion: entrega.guion,
												},
											}
										: {}),
									...(estado.piezasEntregadas?.length
										? { piezas: estado.piezasEntregadas }
										: {}),
									...(errores.length
										? {
												aviso: {
													tipo: tipoAviso,
													mensaje:
														"La respuesta menciona datos no publicados. Revisa los datos antes de usarla.",
												},
											}
										: {}),
								},
							});
						} else writer.write(parte);
					}
				} catch (error) {
					fallo = error;
				} finally {
					lector.releaseLock();
				}
				if (fallo === undefined) return;
				const clasificado = clasificarFallo(fallo);
				console.error(
					JSON.stringify(
						datosRegistroFallo(clasificado.codigo, clasificado.estadoProveedor),
					),
				);
				writer.write({
					type: "error",
					errorText: RESPUESTAS_ERROR_IA[clasificado.codigo].mensaje,
				});
				return;
			},
		});
		return createUIMessageStreamResponse({ stream: flujo, headers: cors });
	};
}
