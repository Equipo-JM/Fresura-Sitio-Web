import { Link } from "react-router";

/**
 * Página de inicio provisional: solo sirve para comprobar el despliegue.
 * El catálogo, la ficha y el pedido llegan en los siguientes pasos de la etapa 2.
 */
export function PaginaInicio() {
	return (
		<main>
			<h1>Fresura</h1>
			<p>Sitio en construcción.</p>
			<footer>
				<Link to="/privacidad">Política de datos</Link>
			</footer>
		</main>
	);
}
