import type { ReactNode } from "react";
import type { Contenido } from "../../supabase/functions/_shared/esquemas/contenido";
import type { OrigenContenido } from "../compartido/contenido/obtenerContenido";
import { useContenido } from "../compartido/contenido/useContenido";

/**
 * Espera el contenido y entrega las partes que cada página necesita. Mientras
 * carga o si falla, muestra el mensaje común en lugar de la página.
 */
export function ConContenido({
	children,
}: {
	children: (contenido: Contenido, origen: OrigenContenido) => ReactNode;
}) {
	const { data, isPending, isError } = useContenido();

	if (isPending) {
		return (
			<section className="seccion" aria-busy="true">
				<div className="envoltura texto-largo">
					<p>Cargando…</p>
				</div>
			</section>
		);
	}

	if (isError) {
		return (
			<section className="seccion">
				<div className="envoltura texto-largo">
					<h1>No pudimos cargar el menú</h1>
					<p>Revisa tu conexión y vuelve a intentarlo en un momento.</p>
				</div>
			</section>
		);
	}

	return <>{children(data.contenido, data.origen)}</>;
}
