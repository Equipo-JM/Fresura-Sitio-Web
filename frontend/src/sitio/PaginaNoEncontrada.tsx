import { Link } from "react-router";

/** Se muestra para cualquier ruta que no exista. */
export function PaginaNoEncontrada() {
	return (
		<section className="pagina">
			<div className="envoltura">
				<div className="vacio">
					<h1>No encontramos esta página</h1>
					<Link className="boton" to="/">
						Volver al inicio
					</Link>
				</div>
			</div>
		</section>
	);
}
