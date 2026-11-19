import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import {
	esquemaReferenciaEstilo,
	type ReferenciaEstilo,
} from "../../../../backend/supabase/functions/_shared/esquemas/referencia";
import type { Database } from "../../tipos/database.types";

/** Referencia guardada, con su identificador para borrarla. */
export type ReferenciaGuardada = ReferenciaEstilo & { id: string };

/** Lee, agrega y borra referencias bajo RLS; valida con el mismo esquema que el agente. */
export function useReferenciasEstilo(cliente: SupabaseClient<Database>) {
	const [referencias, setReferencias] = useState<ReferenciaGuardada[]>([]);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState("");

	const recargar = useCallback(async () => {
		const { data, error: fallo } = await cliente
			.from("referencias_estilo")
			.select("id,red,formato,enlace,texto,publicada_en")
			.order("publicada_en", { ascending: false, nullsFirst: false })
			.order("creado_en", { ascending: false })
			.limit(50);
		setCargando(false);
		if (fallo) {
			setError("No pudimos cargar las referencias.");
			return;
		}
		setReferencias(
			(data ?? []).flatMap(({ id, ...fila }) => {
				const leida = esquemaReferenciaEstilo.safeParse(fila);
				return leida.success ? [{ id, ...leida.data }] : [];
			}),
		);
	}, [cliente]);

	useEffect(() => {
		void recargar();
	}, [recargar]);

	return {
		referencias,
		cargando,
		error,
		/** Devuelve el mensaje de error del formulario, o una cadena vacía si se guardó. */
		async agregar(entrada: unknown): Promise<string> {
			const leida = esquemaReferenciaEstilo.safeParse(entrada);
			if (!leida.success)
				return "Revisa los campos: el texto es obligatorio y el enlace debe empezar por https://.";
			const { error: fallo } = await cliente
				.from("referencias_estilo")
				.insert(leida.data);
			if (fallo) return "No pudimos guardar la referencia. Inténtalo de nuevo.";
			await recargar();
			return "";
		},
		async borrar(id: string) {
			setError("");
			const { error: fallo } = await cliente
				.from("referencias_estilo")
				.delete()
				.eq("id", id);
			if (fallo) setError("No pudimos borrar la referencia.");
			await recargar();
		},
	};
}
