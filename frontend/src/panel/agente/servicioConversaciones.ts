import type { SupabaseClient } from "@supabase/supabase-js";
import { modelMessageSchema, type UIMessage } from "ai";
import {
	esTituloProvisional,
	tituloConversacion,
} from "../../../../backend/supabase/functions/_shared/esquemas/chat";
import {
	crearEsquemaGuion,
	esquemaInstruccionGuion,
	type Guion,
	type InstruccionGuion,
} from "../../../../backend/supabase/functions/_shared/esquemas/guion";
import {
	esquemaPieza,
	type Pieza,
} from "../../../../backend/supabase/functions/_shared/esquemas/pieza";
import type { Database } from "../../tipos/database.types";

/** Entrega validada; guardarla sigue siendo una acción explícita de la administradora. */
export type TarjetaGuion = { instruccion: InstruccionGuion; guion: Guion };
/** Metadatos enviados al terminar el flujo, nunca texto de herramientas internas. */
export type MensajeAgente = UIMessage<{
	tarjetaGuion?: TarjetaGuion;
	piezas?: Pieza[];
	aviso?: { tipo: string; mensaje: string };
}>;
/** Resumen suficiente para seleccionar una conversación sin cargar sus mensajes. */
export type Conversacion = Pick<
	Database["public"]["Tables"]["agente_conversaciones"]["Row"],
	"id" | "titulo" | "actualizado_en"
>;

const CONVERSACIONES_POR_PAGINA = 5;

/** Una página del historial, ordenada por la actividad más reciente. */
export type PaginaConversaciones = {
	numero: number;
	filas: Conversacion[];
	hayAnteriores: boolean;
};

/** Valida también las entregas recuperadas de la memoria antes de ofrecer guardarlas. */
export function leerTarjeta(valor: unknown): TarjetaGuion | undefined {
	if (
		!valor ||
		typeof valor !== "object" ||
		!("instruccion" in valor) ||
		!("guion" in valor)
	)
		return;
	const instruccion = esquemaInstruccionGuion.safeParse(valor.instruccion);
	if (!instruccion.success) return;
	const guion = crearEsquemaGuion(instruccion.data.duracion_s).safeParse(
		valor.guion,
	);
	if (guion.success)
		return { instruccion: instruccion.data, guion: guion.data };
}

/** Valida las piezas del flujo o de la memoria; descarta las que no cumplen el contrato. */
export function leerPiezas(valor: unknown): Pieza[] {
	if (!Array.isArray(valor)) return [];
	return valor.flatMap((pieza) => {
		const leida = esquemaPieza.safeParse(pieza);
		return leida.success ? [leida.data] : [];
	});
}

/** Une resultados exitosos a su llamada por ID; omite razonamiento, herramientas y archivos. */
export function convertirHistorial(
	filas: readonly { id: string; contenido: unknown }[],
): MensajeAgente[] {
	const mensajes: MensajeAgente[] = [];
	const llamadas = new Map<
		string,
		{ mensaje: MensajeAgente; tarjeta: TarjetaGuion }
	>();
	const llamadasPieza = new Map<
		string,
		{ mensaje: MensajeAgente; pieza: Pieza }
	>();
	for (const fila of filas) {
		const resultado = modelMessageSchema.safeParse(fila.contenido);
		if (!resultado.success || resultado.data.role === "system") continue;
		const modelo = resultado.data;
		const partes =
			typeof modelo.content === "string"
				? [{ type: "text" as const, text: modelo.content }]
				: modelo.content;
		const mensaje: MensajeAgente = {
			id: fila.id,
			role: modelo.role === "user" ? "user" : "assistant",
			parts: partes
				.filter((p) => p.type === "text")
				.map((p) => ({ type: "text", text: p.text })),
		};
		if (modelo.role !== "tool") mensajes.push(mensaje);
		for (const parte of partes) {
			if (parte.type === "tool-call" && parte.toolName === "entregar_pieza") {
				const pieza = esquemaPieza.safeParse(parte.input);
				if (pieza.success)
					llamadasPieza.set(parte.toolCallId, { mensaje, pieza: pieza.data });
			}
			if (
				parte.type === "tool-result" &&
				parte.toolName === "entregar_pieza" &&
				parte.output.type === "json"
			) {
				const valor = parte.output.value;
				const llamada = llamadasPieza.get(parte.toolCallId);
				if (
					llamada &&
					valor &&
					typeof valor === "object" &&
					"ok" in valor &&
					valor.ok === true
				)
					llamada.mensaje.metadata = {
						...llamada.mensaje.metadata,
						piezas: [
							...(llamada.mensaje.metadata?.piezas ?? []),
							llamada.pieza,
						],
					};
			}
			if (parte.type === "tool-call" && parte.toolName === "entregar_guion") {
				const tarjeta = leerTarjeta(parte.input);
				if (tarjeta) llamadas.set(parte.toolCallId, { mensaje, tarjeta });
			}
			if (
				parte.type === "tool-result" &&
				parte.toolName === "entregar_guion" &&
				parte.output.type === "json"
			) {
				const valor = parte.output.value;
				const llamada = llamadas.get(parte.toolCallId);
				if (
					llamada &&
					valor &&
					typeof valor === "object" &&
					"ok" in valor &&
					valor.ok === true
				)
					llamada.mensaje.metadata = {
						...llamada.mensaje.metadata,
						tarjetaGuion: llamada.tarjeta,
					};
			}
		}
	}
	return mensajes.filter(
		(m) =>
			m.parts.length || m.metadata?.tarjetaGuion || m.metadata?.piezas?.length,
	);
}

/** Recupera un tema para conversaciones antiguas guardadas como un número o saludo. */
async function titularConversacionAnterior(
	cliente: SupabaseClient<Database>,
	fila: Conversacion,
): Promise<Conversacion> {
	if (!esTituloProvisional(fila.titulo)) return fila;
	const { data, error } = await cliente
		.from("agente_mensajes")
		.select("id,contenido")
		.eq("conversacion_id", fila.id)
		.order("creado_en", { ascending: false })
		.limit(40);
	const mensajes =
		error || !data ? [] : convertirHistorial([...data].reverse());
	const guion = mensajes.findLast((m) => m.metadata?.tarjetaGuion)?.metadata
		?.tarjetaGuion;
	const tema = mensajes
		.filter((m) => m.role === "user")
		.flatMap((m) => m.parts)
		.find(
			(p) => p.type === "text" && p.text.trim() && !esTituloProvisional(p.text),
		);
	const titulo =
		guion && !esTituloProvisional(guion.guion.titulo)
			? guion.guion.titulo
			: tema?.type === "text"
				? tema.text
				: fila.titulo;
	return { ...fila, titulo: tituloConversacion(titulo) };
}

/** CRUD bajo RLS; el servidor es el único que escribe los mensajes del chat. */
export function crearServicioConversaciones(cliente: SupabaseClient<Database>) {
	return {
		async listar(numero = 0): Promise<PaginaConversaciones> {
			const desde = numero * CONVERSACIONES_POR_PAGINA;
			const { data, error } = await cliente
				.from("agente_conversaciones")
				.select("id,titulo,actualizado_en")
				.order("actualizado_en", { ascending: false })
				.order("id", { ascending: false })
				.range(desde, desde + CONVERSACIONES_POR_PAGINA);
			if (error)
				throw new Error(
					"No pudimos cargar las conversaciones. Inténtalo de nuevo.",
				);
			const filas = data ?? [];
			return {
				numero,
				filas: await Promise.all(
					filas
						.slice(0, CONVERSACIONES_POR_PAGINA)
						.map((fila) => titularConversacionAnterior(cliente, fila)),
				),
				hayAnteriores: filas.length > CONVERSACIONES_POR_PAGINA,
			};
		},
		async crear(mensaje: string): Promise<Conversacion> {
			const { data, error } = await cliente
				.from("agente_conversaciones")
				.insert({ titulo: tituloConversacion(mensaje) })
				.select("id,titulo,actualizado_en")
				.maybeSingle();
			if (error || !data)
				throw new Error(
					"No pudimos crear la conversación. Inténtalo de nuevo.",
				);
			return data;
		},
		async borrar(id: string) {
			const { error } = await cliente
				.from("agente_conversaciones")
				.delete()
				.eq("id", id);
			if (error)
				throw new Error(
					"No pudimos borrar la conversación. Inténtalo de nuevo.",
				);
		},
		async cargar(id: string) {
			const { data, error } = await cliente
				.from("agente_mensajes")
				.select("id,contenido")
				.eq("conversacion_id", id)
				.order("creado_en", { ascending: true });
			if (error)
				throw new Error("No pudimos cargar los mensajes. Inténtalo de nuevo.");
			return convertirHistorial(data ?? []);
		},
	};
}

/** Cuerpo del guion para leer y seleccionar directamente en el chat. */
export function cuerpoGuion(guion: Guion) {
	return [
		`Gancho: ${guion.gancho}`,
		...guion.escenas.map(
			(e, i) =>
				`Escena ${i + 1} (${e.inicio_s}–${e.fin_s} s)\nQué se ve: ${e.que_se_ve}\nTexto en pantalla: ${e.texto_pantalla}\nVoz o diálogo: ${e.voz}`,
		),
		`Llamado a la acción: ${guion.llamado_accion}`,
		`Texto de la publicación: ${guion.texto_publicacion}`,
		`Música sugerida: ${guion.musica_sugerida}`,
		`Notas de producción: ${guion.notas_produccion}`,
	].join("\n\n");
}
