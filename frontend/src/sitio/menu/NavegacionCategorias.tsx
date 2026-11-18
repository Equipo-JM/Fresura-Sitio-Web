import { Link } from "react-router";
import type { Contenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";
import { useCategoriaActiva } from "./useCategoriaActiva";

/**
 * Botones de categorías fijos bajo el encabezado de /menu: llevan a cada
 * sección y marcan la que se está viendo. «Todo» vuelve al principio del menú.
 */
export function NavegacionCategorias({
	categorias,
}: {
	categorias: Contenido["categorias"];
}) {
	const ordenadas = [...categorias].sort((a, b) => a.orden - b.orden);
	const activa = useCategoriaActiva(ordenadas.map((c) => c.id));
	return (
		<nav className="nav-categorias" aria-label="Categorías del menú">
			<ul className="envoltura">
				<li>
					<Link
						className="chip-categoria"
						to="/menu#menu"
						aria-current={activa === null ? "true" : undefined}
					>
						Todo
					</Link>
				</li>
				{ordenadas.map((c) => (
					<li key={c.id}>
						<Link
							className="chip-categoria"
							to={`/menu#cat-${c.id}`}
							aria-current={activa === c.id ? "true" : undefined}
						>
							{c.nombre}
						</Link>
					</li>
				))}
			</ul>
		</nav>
	);
}
