import { useEffect } from "react";
import { Link } from "react-router";

/**
 * Página `/privacidad`. Mientras la política no tenga revisión jurídica ni los
 * datos de Fresura, muestra solo el aviso breve y avisa que está en revisión
 * (SRS 11.6). Los textos son los «Avisos del sitio» de esa sección.
 */
export function PaginaPrivacidad() {
	useEffect(() => {
		document.title = "Política de datos · Fresura";
	}, []);

	return (
		<main>
			<h1>Política de tratamiento de datos</h1>
			<p>
				<strong>La política completa está en revisión.</strong> La publicaremos
				aquí cuando esté lista.
			</p>

			<h2>Tus datos en el pedido</h2>
			<p>
				Tus datos van solo en el mensaje que envías por WhatsApp, para atender
				tu pedido. Este sitio no los guarda.
			</p>

			<h2>Tu ubicación</h2>
			<p>
				Usamos tu ubicación solo para ver si llegamos a tu zona. No se envía ni
				se guarda.
			</p>

			<p>
				<Link to="/">Volver al inicio</Link>
			</p>
		</main>
	);
}
