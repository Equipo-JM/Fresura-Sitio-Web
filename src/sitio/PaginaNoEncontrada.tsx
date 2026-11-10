import { Link } from "react-router";

/** Se muestra para cualquier ruta que no exista. */
export function PaginaNoEncontrada() {
	return (
		<main>
			<h1>No encontramos esta página</h1>
			<p>
				<Link to="/">Volver al inicio</Link>
			</p>
		</main>
	);
}
