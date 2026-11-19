import type { SupabaseClient } from "@supabase/supabase-js";
import type { Pieza } from "../../../../backend/supabase/functions/_shared/esquemas/pieza";
import type { Database, Json } from "../../tipos/database.types";
import {
	leerPiezas,
	leerTarjeta,
	type TarjetaGuion,
} from "../agente/servicioConversaciones";

/** Pieza guardada, ya validada con los esquemas compartidos. */
export type EntradaBiblioteca = {
	id: string;
	titulo: string;
	creadoEn: string;
} & (
	| { tipo: "guion"; tarjeta: TarjetaGuion }
	| { tipo: Pieza["tipo"]; pieza: Pieza }
);

const MAXIMO_ENTRADAS = 100;

/** Convierte una fila en entrada; descarta la que no cumple el contrato actual. */
export function leerEntrada(fila: {
	id: string;
	tipo: string;
	titulo: string;
	creado_en: string;
	contenido: unknown;
}): EntradaBiblioteca | undefined {
	const base = {
		id: fila.id,
		titulo: fila.titulo,
		creadoEn: fila.creado_en,
	} as const;
	if (fila.tipo === "guion") {
		const tarjeta = leerTarjeta(fila.contenido);
		return tarjeta ? { ...base, tipo: "guion", tarjeta } : undefined;
	}
	const [pieza] = leerPiezas([fila.contenido]);
	return pieza && pieza.tipo === fila.tipo
		? { ...base, tipo: pieza.tipo, pieza }
		: undefined;
}

/** Biblioteca bajo RLS: solo la persona administradora con segundo paso la lee y la cambia. */
export function crearServicioBiblioteca(cliente: SupabaseClient<Database>) {
	const tabla = () => cliente.from("biblioteca_piezas");
	async function insertar(fila: {
		tipo: string;
		titulo: string;
		red: string | null;
		contenido: Json;
		conversacion_id: string | null;
	}) {
		const { error } = await tabla().insert(fila);
		if (error)
			throw new Error("No pudimos guardar la pieza. Inténtalo de nuevo.");
	}
	return {
		async listar(): Promise<EntradaBiblioteca[]> {
			const { data, error } = await tabla()
				.select("id,tipo,titulo,creado_en,contenido")
				.order("creado_en", { ascending: false })
				.order("id", { ascending: false })
				.limit(MAXIMO_ENTRADAS);
			if (error) throw new Error("No pudimos cargar la biblioteca.");
			return (data ?? []).flatMap((fila) => leerEntrada(fila) ?? []);
		},
		guardarPieza: (pieza: Pieza, conversacion: string | null) =>
			insertar({
				tipo: pieza.tipo,
				titulo: pieza.titulo,
				red: pieza.red,
				contenido: pieza,
				conversacion_id: conversacion,
			}),
		guardarGuion: (tarjeta: TarjetaGuion, conversacion: string | null) =>
			insertar({
				tipo: "guion",
				titulo: tarjeta.guion.titulo,
				red: tarjeta.instruccion.red,
				contenido: tarjeta,
				conversacion_id: conversacion,
			}),
		async borrar(id: string) {
			const { error } = await tabla().delete().eq("id", id);
			if (error) throw new Error("No pudimos borrar la pieza.");
		},
	};
}
