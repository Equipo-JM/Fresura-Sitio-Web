import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Database } from "../../tipos/database.types";
import {
	crearServicioBiblioteca,
	type EntradaBiblioteca,
} from "./servicioBiblioteca";

/** Carga la biblioteca al montar y expone las acciones con su error visible. */
export function useBiblioteca(cliente: SupabaseClient<Database>) {
	const servicio = useMemo(() => crearServicioBiblioteca(cliente), [cliente]);
	const [entradas, setEntradas] = useState<EntradaBiblioteca[]>([]);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState("");

	const recargar = useCallback(async () => {
		setError("");
		try {
			setEntradas(await servicio.listar());
		} catch (fallo) {
			setError(fallo instanceof Error ? fallo.message : String(fallo));
		} finally {
			setCargando(false);
		}
	}, [servicio]);

	useEffect(() => {
		void recargar();
	}, [recargar]);

	async function ejecutar(accion: () => Promise<void>) {
		setError("");
		try {
			await accion();
			await recargar();
		} catch (fallo) {
			setError(fallo instanceof Error ? fallo.message : String(fallo));
		}
	}

	return {
		entradas,
		cargando,
		error,
		borrar: (id: string) => ejecutar(() => servicio.borrar(id)),
	};
}
