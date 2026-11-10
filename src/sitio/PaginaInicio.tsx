import { useContenido } from "../compartido/contenido/useContenido";
import { MarcaPorValidar } from "./MarcaPorValidar";

/**
 * Inicio provisional: muestra la presentación del negocio leída del contenido,
 * para comprobar la lectura de punta a punta. El catálogo, la ficha y el pedido
 * llegan en los siguientes pasos de la etapa 2.
 */
export function PaginaInicio() {
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

	const { contenido, origen } = data;
	const { presentacion } = contenido.negocio;

	return (
		<section className="seccion">
			<div className="envoltura texto-largo">
				{contenido.estado === "ejemplo" && (
					<p>
						<MarcaPorValidar />
					</p>
				)}
				<h1>{presentacion.titulo}</h1>
				<p>{presentacion.texto}</p>
				{origen === "respaldo" && (
					<p role="status" className="negrita">
						Consulta precios por WhatsApp.
					</p>
				)}
			</div>
		</section>
	);
}
