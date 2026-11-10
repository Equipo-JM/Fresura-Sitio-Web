import { Link } from "react-router";

/** Se muestra para cualquier ruta que no exista. */
export function PaginaNoEncontrada() {
	return (
		<section className="seccion">
			<div className="envoltura texto-largo">
				<h1>No encontramos esta página</h1>
				<p>
					<Link className="boton" to="/">
						Volver al inicio
					</Link>
				</p>
			</div>
		</section>
	);
}
