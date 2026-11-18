import { useChat } from "@ai-sdk/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { esquemaChat } from "../../../../backend/supabase/functions/_shared/esquemas/chat";
import type { Database } from "../../tipos/database.types";
import { invocarFuncionIa } from "../guiones/servicioGuiones";
import {
	crearServicioConversaciones,
	type MensajeAgente,
	type PaginaConversaciones,
} from "./servicioConversaciones";

const ERROR_GENERICO =
	"No se pudo generar el guion. Inténtalo de nuevo en unos minutos.";

/** Adapta HTTP al invocador común: Supabase resuelve URL y sesión, el SDK consume el SSE. */
export function crearTransporteChat(
	cliente: SupabaseClient<Database>,
	conversacion: () => string | null,
) {
	return new DefaultChatTransport<MensajeAgente>({
		api: "ia/chat",
		prepareSendMessagesRequest: ({ messages }) => {
			const ultimo = messages.findLast((m) => m.role === "user");
			const mensaje =
				ultimo?.parts
					.filter((p) => p.type === "text")
					.map((p) => p.text)
					.join("") ?? "";
			return {
				body: esquemaChat.parse({ conversacion_id: conversacion(), mensaje }),
			};
		},
		fetch: async (_url, opciones) => {
			const respuesta = await invocarFuncionIa(
				cliente,
				"chat",
				JSON.parse(String(opciones?.body)),
				ERROR_GENERICO,
				opciones?.signal ?? undefined,
			);
			if (!(respuesta instanceof Response)) throw new Error(ERROR_GENERICO);
			return respuesta;
		},
	});
}

/** Mantiene el flujo y serializa cambios de conversación para no mezclar respuestas ni historiales. */
export function useChatAgente(cliente: SupabaseClient<Database>) {
	const servicio = useMemo(
		() => crearServicioConversaciones(cliente),
		[cliente],
	);
	const activaRef = useRef<string | null>(null);
	const bloqueo = useRef(false);
	const revision = useRef(0);
	const [activa, setActiva] = useState<string | null>(null);
	const [historial, setHistorial] = useState<PaginaConversaciones>({
		numero: 0,
		filas: [],
		hayAnteriores: false,
	});
	const [errorHistorial, setErrorHistorial] = useState("");
	const revisionHistorial = useRef(0);
	const [ocupado, setOcupado] = useState(false);
	const [errorLocal, setErrorLocal] = useState("");
	const ultimoEnvio = useRef("");
	const transporte = useMemo(
		() => crearTransporteChat(cliente, () => activaRef.current),
		[cliente],
	);
	const chat = useChat<MensajeAgente>({ transport: transporte });
	const respondiendo =
		chat.status === "submitted" || chat.status === "streaming";
	const error = errorLocal || chat.error?.message || "";
	const estado = error
		? "error"
		: chat.status === "streaming"
			? "respondiendo"
			: ocupado || chat.status === "submitted"
				? "enviando"
				: "listo";
	const cargarPagina = useCallback(
		async (numero: number) => {
			const consulta = ++revisionHistorial.current;
			setErrorHistorial("");
			try {
				let pagina = await servicio.listar(numero);
				if (numero > 0 && !pagina.filas.length)
					pagina = await servicio.listar(numero - 1);
				if (consulta === revisionHistorial.current) setHistorial(pagina);
			} catch {
				if (consulta === revisionHistorial.current)
					setErrorHistorial(
						"No pudimos cargar el historial de conversaciones.",
					);
			}
		},
		[servicio],
	);
	useEffect(() => {
		void cargarPagina(0);
		return () => {
			revisionHistorial.current++;
			revision.current++;
		};
	}, [cargarPagina]);
	async function ejecutar(accion: () => Promise<void>) {
		if (bloqueo.current || respondiendo) return;
		bloqueo.current = true;
		setOcupado(true);
		setErrorLocal("");
		chat.clearError();
		try {
			await accion();
		} catch (fallo) {
			setErrorLocal(
				fallo instanceof Error && !(fallo instanceof TypeError)
					? fallo.message
					: ERROR_GENERICO,
			);
		} finally {
			bloqueo.current = false;
			setOcupado(false);
		}
	}
	async function enviar(texto: string, reintento = false) {
		const mensaje = texto.trim();
		if (!mensaje || mensaje.length > 2000) return;
		ultimoEnvio.current = mensaje;
		await ejecutar(async () => {
			const turno = revision.current;
			if (!activaRef.current) {
				const conversacion = await servicio.crear(mensaje);
				activaRef.current = conversacion.id;
				setActiva(conversacion.id);
			}
			if (turno !== revision.current) return;
			if (reintento && chat.messages.some((m) => m.role === "user"))
				await chat.regenerate();
			else await chat.sendMessage({ text: mensaje });
			await cargarPagina(0);
		});
	}
	function nuevaConversacion() {
		if (bloqueo.current || respondiendo) return;
		revision.current++;
		activaRef.current = null;
		setActiva(null);
		chat.setMessages([]);
		chat.clearError();
		setErrorLocal("");
		ultimoEnvio.current = "";
	}
	return {
		mensajes: chat.messages,
		estado,
		error,
		historial,
		errorHistorial,
		cambiarPagina: (numero: number) => ejecutar(() => cargarPagina(numero)),
		conversacionActiva: activa,
		ocupado: ocupado || respondiendo,
		enviar,
		reintentar: () =>
			ultimoEnvio.current
				? enviar(ultimoEnvio.current, true)
				: ejecutar(async () => {
						if (activaRef.current)
							chat.setMessages(await servicio.cargar(activaRef.current));
					}),
		detener: () => {
			revision.current++;
			return chat.stop();
		},
		nuevaConversacion,
		cambiarConversacion: (id: string) =>
			ejecutar(async () => {
				const turno = ++revision.current;
				const mensajes = await servicio.cargar(id);
				if (turno !== revision.current) return;
				activaRef.current = id;
				setActiva(id);
				ultimoEnvio.current = "";
				chat.setMessages(mensajes);
			}),
		borrar: (id: string) =>
			ejecutar(async () => {
				await servicio.borrar(id);
				setHistorial((pagina) => ({
					...pagina,
					filas: pagina.filas.filter((f) => f.id !== id),
				}));
				if (activaRef.current === id) {
					activaRef.current = null;
					setActiva(null);
					chat.setMessages([]);
					ultimoEnvio.current = "";
				}
				await cargarPagina(historial.numero);
			}),
	};
}
