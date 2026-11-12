import { type ReactNode, useMemo } from "react";
import type { Contenido } from "../../supabase/functions/_shared/esquemas/contenido";
import type { OrigenContenido } from "../compartido/contenido/obtenerContenido";
import { useContenido } from "../compartido/contenido/useContenido";
import { aplicarFotosDemo } from "../compartido/fotos/aplicarFotosDemo";
import { useFotosDemo } from "../compartido/fotos/useFotosDemo";

/**
 * Espera el contenido y entrega las partes que cada página necesita. Mientras
 * carga o si falla, muestra el mensaje común en lugar de la página. Las fotos
 * cambiadas en el panel de demostración reemplazan a las del contenido.
 */
export function ConContenido({
	children,
}: {
	children: (contenido: Contenido, origen: OrigenContenido) => ReactNode;
}) {
	const { data, isPending, isError } = useContenido();
	const fotos = useFotosDemo();
	const contenido = useMemo(
		() => (data ? aplicarFotosDemo(data.contenido, fotos) : undefined),
		[data, fotos],
	);

	if (isPending) {
		return (
			<section className="seccion" aria-busy="true">
				<div className="envoltura texto-largo">
					<p>Cargando…</p>
				</div>
			</section>
		);
	}

	if (isError || !contenido) {
		return (
			<section className="seccion">
				<div className="envoltura texto-largo">
					<h1>No pudimos cargar el menú</h1>
					<p>Revisa tu conexión y vuelve a intentarlo en un momento.</p>
				</div>
			</section>
		);
	}

	return <>{children(contenido, data.origen)}</>;
}
