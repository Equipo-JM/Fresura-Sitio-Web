import { Link } from "react-router";
import { Icono } from "../compartido/componentes/Icono";

/**
 * Página `/privacidad`. Mientras la política no tenga revisión jurídica ni los
 * datos de Fresura, muestra el aviso breve y avisa que está en revisión
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
						El sitio prepara un mensaje con tu nombre, teléfono y pedido. Si
						pides domicilio, incluye tu dirección y barrio. Fresura recibe estos
						datos cuando envías el mensaje por WhatsApp y los usa para confirmar
						y atender el pedido. El sitio no guarda tus datos de contacto.
					</p>

					<p>
						Si das permiso, tu navegador usa tu ubicación para comprobar si
						estás dentro de la zona de domicilios. La ubicación no se envía ni
						se guarda.
					</p>
					<p>
						Los mapas y las publicaciones insertadas pueden cargar contenido de
						Google Maps e Instagram. Cada proveedor aplica su propia política de
						datos.
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
