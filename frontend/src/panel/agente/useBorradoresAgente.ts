import type { SupabaseClient } from "@supabase/supabase-js";
import { useMemo, useRef, useState } from "react";
import type { Database } from "../../tipos/database.types";
import {
	crearServicioGuiones,
	type GuionGuardado,
} from "../guiones/servicioGuiones";
import type { TarjetaGuion } from "./servicioConversaciones";

/** Guarda cada tarjeta una sola vez durante esta vista y entrega la fila al editor existente. */
export function useBorradoresAgente(
	cliente: SupabaseClient<Database>,
	abrir: (fila: GuionGuardado) => void,
	productos: { id: string; nombre: string }[],
) {
	const servicio = useMemo(() => crearServicioGuiones(cliente), [cliente]);
	const [guardados, setGuardados] = useState<Set<string>>(new Set());
	const [guardando, setGuardando] = useState(false);
	const [error, setError] = useState("");
	const bloqueo = useRef(false);
	return {
		guardados,
		guardando,
		error,
		guardar: async (id: string, tarjeta: TarjetaGuion) => {
			if (bloqueo.current || guardados.has(id)) return;
			bloqueo.current = true;
			setGuardando(true);
			setError("");
			try {
				const nombre =
					productos.find((p) => p.id === tarjeta.instruccion.producto_id)
						?.nombre ?? tarjeta.instruccion.producto_id;
				const fila = await servicio.guardar(
					tarjeta.instruccion,
					nombre,
					tarjeta.guion,
					tarjeta.guion,
					null,
				);
				setGuardados((actual) => new Set([...actual, id]));
				abrir(fila);
			} catch {
				setError("No pudimos guardar el guion. Inténtalo de nuevo.");
			} finally {
				bloqueo.current = false;
				setGuardando(false);
			}
		},
	};
}
