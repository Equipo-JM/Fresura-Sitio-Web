import { Link } from "react-router";
import { Icono } from "../compartido/componentes/Icono";

/**
 * Página `/privacidad`. Mientras la política no tenga revisión jurídica ni los
 * datos de Fresura, muestra solo el aviso breve y avisa que está en revisión
 * (SRS 11.6). Los textos son los «Avisos del sitio» de esa sección.
 */
export function PaginaPrivacidad() {
	return (
		<section className="pagina">
			<div className="envoltura">
				<div className="prosa">
					<h1>
						Política <em>de datos</em>
					</h1>
					<p className="alerta">
						<Icono nombre="alerta" />
						<span>
							Esta política está en revisión. Mientras tanto, te contamos lo
							esencial.
						</span>
					</p>

					<p>
						Tus datos van solo en el mensaje que envías por WhatsApp, para
						atender tu pedido. Este sitio no los guarda.
					</p>

					<p>
						Usamos tu ubicación solo aquí, para ver si llegamos a tu zona. No se
						envía ni se guarda.
					</p>
					<p>No creamos cuentas de clientes ni pedimos datos sensibles.</p>
					<p>
						<Link className="boton secundario" to="/">
							Volver al inicio
						</Link>
					</p>
				</div>
			</div>
		</section>
	);
}
