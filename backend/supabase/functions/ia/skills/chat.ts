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
	esquemaChat,
	esTituloProvisional,
	tituloConversacion,
} from "../../_shared/esquemas/chat.ts";
import { esquemaContenido } from "../../_shared/esquemas/contenido.ts";
import {
	esquemaReferenciaEstilo,
	MAXIMO_REFERENCIAS_AGENTE,
	type ReferenciaEstilo,
} from "../../_shared/esquemas/referencia.ts";
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

/** Dependencias con RLS y proveedor sustituible para probar el flujo sin conexiones externas. */
export type OpcionesRutaChat = {
	crearCliente: (jwt: string) => SupabaseClient;
	claveGemini: string;
	modeloAgente: string;
	modeloRespaldo: string;
	crearModelo?: (id: string) => ModeloBase;
};

/** Modelo que acepta el envoltorio del SDK (el de Google y los simulados de las pruebas). */
type ModeloBase = Parameters<typeof wrapLanguageModel>[0]["model"];

function clasificarFallo(error: unknown): ErrorIa {
	if (error instanceof ErrorIa) return error;
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

function tarjetas(estado: EstadoAgente) {
	const entrega = estado.guionEntregado;
	return {
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
	};
}

/** Cambia de modelo antes de abrir el flujo, sin repetir texto ni herramientas ya emitidos. */
export function modeloConRespaldo(
	principal: ModeloBase,
	crearRespaldo: () => ModeloBase,
	registrar: (tipo: string, estado?: number) => void,
) {
	let respaldo: ReturnType<typeof wrapLanguageModel> | undefined;
	let usarRespaldo = false;
	let reintentoUsado = false;
	let principalSinCupo = false;
	let respaldoSinCupo = false;
	return wrapLanguageModel({
		model: principal,
		middleware: {
			wrapStream: async ({ model, params }) => {
				async function abrir(alternativo: boolean, esperaMs: number) {
					let elegido = model;
					if (alternativo) {
						respaldo ??= wrapLanguageModel({
							model: crearRespaldo(),
							middleware: {},
						});
						elegido = respaldo;
					}
					const limite = new AbortController();
					const reloj = setTimeout(() => limite.abort(), esperaMs);
					const signal = params.abortSignal
						? AbortSignal.any([params.abortSignal, limite.signal])
						: limite.signal;
					try {
						return await elegido.doStream({ ...params, abortSignal: signal });
					} catch (error) {
						params.abortSignal?.throwIfAborted();
						if (limite.signal.aborted) throw new ErrorIa("ia_tiempo");
						throw error;
					} finally {
						clearTimeout(reloj);
					}
				}
				for (let intento = 0; ; intento++) {
					try {
						return await abrir(usarRespaldo, intento === 0 ? 15_000 : 30_000);
					} catch (error) {
						params.abortSignal?.throwIfAborted();
						const fallo = clasificarFallo(error);
						if (fallo.codigo === "ia_cupo") {
							if (usarRespaldo) respaldoSinCupo = true;
							else principalSinCupo = true;
						}
						const otroSinCupo = usarRespaldo
							? principalSinCupo
							: respaldoSinCupo;
						if (
							otroSinCupo ||
							(fallo.estadoProveedor !== 503 &&
								fallo.codigo !== "ia_cupo" &&
								!(error instanceof ErrorIa && error.codigo === "ia_tiempo"))
						)
							throw error;
						if (intento > 0) {
							if (reintentoUsado || fallo.estadoProveedor !== 503) throw error;
							reintentoUsado = true;
							await new Promise((resolver) => setTimeout(resolver, 1000));
							params.abortSignal?.throwIfAborted();
						}
						registrar(fallo.codigo, fallo.estadoProveedor);
						usarRespaldo = !usarRespaldo;
					}
				}
			},
		},
	});
}

/**
 * Publicaciones recientes para imitar el estilo. Un fallo al leerlas no
 * detiene el chat: el agente sigue con el perfil de marca.
 */
async function leerReferenciasEstilo(
	cliente: SupabaseClient,
): Promise<ReferenciaEstilo[]> {
	const { data, error } = await cliente
		.from("referencias_estilo")
		.select("red,formato,enlace,texto,publicada_en")
		.order("publicada_en", { ascending: false, nullsFirst: false })
		.order("creado_en", { ascending: false })
		.limit(MAXIMO_REFERENCIAS_AGENTE);
	if (error) {
		console.error(JSON.stringify(datosRegistroFallo("lectura_referencias")));
		return [];
	}
	return (data ?? []).flatMap((fila) => {
		const leida = esquemaReferenciaEstilo.safeParse(fila);
		return leida.success ? [leida.data] : [];
	});
}

async function actualizarTitulo(
	cliente: SupabaseClient,
	id: string,
	tituloAnterior: string,
	estado: EstadoAgente,
) {
	const entrega = estado.guionEntregado;
	if (!entrega || esTituloProvisional(entrega.guion.titulo)) return;
	const titulo = tituloConversacion(entrega.guion.titulo);
	if (titulo === tituloAnterior) return;
	const { error } = await cliente
		.from("agente_conversaciones")
		.update({ titulo })
		.eq("id", id)
		.eq("titulo", tituloAnterior);
	if (error)
		console.error(
			JSON.stringify(datosRegistroFallo("escritura_titulo_conversacion")),
		);
}

/** Abre un turno con el historial del administrador y transmite sus entregas validadas. */
export function crearRutaChat(opciones: OpcionesRutaChat): ManejadorRuta {
	const crearModelo =
		opciones.crearModelo ??
		createGoogleGenerativeAI({ apiKey: opciones.claveGemini });
	return async ({ peticion, jwt, cors }) => {
		const inicio = Date.now();
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
		const [{ data, error }, historial, referencias] = await Promise.all([
			cliente
				.from("versiones_contenido")
				.select("json")
				.eq("estado", "publicada")
				.maybeSingle(),
			cargarMensajes(cliente, id),
			leerReferenciasEstilo(cliente),
		]);
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
		const nuevo: ModelMessage = { role: "user", content: mensaje };
		await guardarMensajes(cliente, id, [nuevo]);
		const estado: EstadoAgente = {
			productosConsultados: new Set(),
		};
		const hoy = fechaColombia(new Date());
		const herramientas = crearHerramientasAgente(
			contenido.data,
			hoy,
			estado,
			referencias,
		);
		const instrucciones = [
			INSTRUCCIONES_AGENTE,
			// El calendario y las fechas especiales se cuentan desde hoy en Colombia.
			`Hoy es ${hoy} (hora de Colombia).`,
			...(contenido.data.estado === "ejemplo"
				? [
						"La versión publicada es de ejemplo. Puedes usarla para la demo. Si el guion se apoya en estos datos, avisa a la persona administradora en el chat para que los verifique antes de usar el guion.",
					]
				: []),
		].join("\n\n");
		const flujo = createUIMessageStream({
			onError: () => RESPUESTAS_ERROR_IA.ia_tiempo.mensaje,
			execute: async ({ writer }) => {
				writer.write({ type: "start", messageId: crypto.randomUUID() });
				let fallo: unknown;
				let texto = "";
				const hayEntrega = () =>
					Boolean(estado.guionEntregado || estado.piezasEntregadas?.length);
				const completados: ModelMessage[] = [];
				let hastaEntrega = 0;
				let terminado = false;
				let primerContenidoMs: number | undefined;
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
					messages: [...historial, nuevo],
					tools: herramientas,
					stopWhen: isStepCount(MAXIMO_PASOS_AGENTE),
					// El middleware controla el único reintento adicional por turno.
					maxRetries: 0,
					// Un turno encadena hasta MAXIMO_PASOS_AGENTE llamadas y, con Gemini saturado,
					// el 17 nov tardó 46 s antes de un 503; 100 s deja espacio al respaldo dentro
					// de los 150 s de la Edge Function (DT-01, sección 11).
					abortSignal: AbortSignal.timeout(100_000),
					onError: ({ error }) => {
						fallo = error;
					},
					onStepFinish: (paso) => {
						completados.push(...paso.response.messages);
						if (
							paso.toolResults.some(
								(r) =>
									(r.toolName === "entregar_guion" ||
										r.toolName === "entregar_pieza") &&
									typeof r.output === "object" &&
									r.output !== null &&
									"ok" in r.output &&
									r.output.ok === true,
							)
						) {
							hastaEntrega = completados.length;
							primerContenidoMs ??= Date.now() - inicio;
							writer.write({
								type: "message-metadata",
								messageMetadata: tarjetas(estado),
							});
						}
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
						if (parte.type === "abort") {
							fallo ??= new ErrorIa("ia_tiempo");
							continue;
						}
						if (parte.type === "error") {
							fallo ??= new Error("fallo_flujo");
							continue;
						}
						if (fallo !== undefined) continue;
						if (parte.type === "text-delta") {
							texto += parte.delta;
							if (parte.delta.trim()) primerContenidoMs ??= Date.now() - inicio;
						}
						if (parte.type === "finish") {
							if (!texto.trim() && !hayEntrega()) {
								fallo = new ErrorIa(
									parte.finishReason === "content-filter"
										? "ia_bloqueado"
										: "ia_estructura",
								);
								continue;
							}
							terminado = true;
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
							writer.write({
								...parte,
								messageMetadata: {
									...tarjetas(estado),
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
				if (!terminado && fallo === undefined) fallo = new ErrorIa("ia_tiempo");
				const guardar =
					fallo === undefined
						? completados
						: completados.slice(0, hastaEntrega);
				if (guardar.length) {
					await guardarMensajes(cliente, id, guardar);
					if (hastaEntrega)
						await actualizarTitulo(cliente, id, conversacion.titulo, estado);
				}
				console.info(
					JSON.stringify({
						evento: "chat_fin",
						completo: fallo === undefined,
						primer_contenido_ms: primerContenidoMs,
						duracion_ms: Date.now() - inicio,
					}),
				);
				if (fallo === undefined) return;
				const clasificado = clasificarFallo(fallo);
				console.error(
					JSON.stringify(
						datosRegistroFallo(clasificado.codigo, clasificado.estadoProveedor),
					),
				);
				writer.write({
					type: "error",
					errorText:
						clasificado.estadoProveedor === 503
							? "Gemini está saturado en este momento. Puedes reintentar este mensaje."
							: RESPUESTAS_ERROR_IA[clasificado.codigo].mensaje,
				});
				return;
			},
		});
		return createUIMessageStreamResponse({ stream: flujo, headers: cors });
	};
}
