import type { SupabaseClient } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { esquemaContenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";
import { FuenteContenido } from "../../compartido/contenido/FuenteContenido";
import type { ContenidoLeido } from "../../compartido/contenido/obtenerContenido";
import type { Database } from "../../tipos/database.types";

/** Lee exclusivamente el borrador con la sesión del panel; nunca muestra el respaldo. */
export function VistaPrevia({
	cliente,
	children,
}: {
	cliente: SupabaseClient<Database>;
	children: ReactNode;
}) {
	const consulta = useQuery({
		queryKey: ["borrador-vista-previa"],
		queryFn: async (): Promise<ContenidoLeido> => {
			const { data, error } = await cliente
				.from("versiones_contenido")
				.select("json")
				.eq("estado", "borrador")
				.single();
			if (error || !data) throw new Error("sin_borrador");
			return {
				contenido: esquemaContenido.parse(data.json),
				origen: "principal",
			};
		},
		retry: false,
		gcTime: 0,
	});
	return (
		<>
			<aside className="panel-vista-previa" aria-label="Vista previa">
				<strong>Vista previa · Borrador sin publicar</strong>
				<a className="boton secundario compacto" href="/admin">
					Volver al panel
				</a>
			</aside>
			{consulta.isPending && (
				<p className="envoltura" role="status">
					Cargando…
				</p>
			)}
			{consulta.isError && (
				<p className="envoltura" role="alert">
					No pudimos abrir el borrador. Vuelve al panel e inténtalo de nuevo.
				</p>
			)}
			{consulta.data && !consulta.isError && (
				<FuenteContenido value={consulta.data}>{children}</FuenteContenido>
			)}
		</>
	);
}
