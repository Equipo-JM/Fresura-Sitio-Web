import type { Contenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";
import { TarjetaProducto } from "./Categorias";

/**
 * Productos que el administrador marca como destacados (RF-07), en el orden
 * de su categoría y del producto. Si no hay ninguno vigente, la franja no se
 * muestra: nunca queda un bloque vacío.
 */
export function Destacados({
	contenido,
	respaldo = false,
}: {
	contenido: Contenido;
	respaldo?: boolean;
}) {
	const ordenCategoria = new Map(
		contenido.categorias.map((c) => [c.id, c.orden]),
	);
	const destacados = contenido.productos
		.filter((p) => p.destacado && p.vigente)
		.sort(
			(a, b) =>
				(ordenCategoria.get(a.categoria) ?? 0) -
					(ordenCategoria.get(b.categoria) ?? 0) || a.orden - b.orden,
		);
	if (destacados.length === 0) return null;

	return (
		<section
			className="seccion destacados fondo-dust"
			id="destacados"
			aria-labelledby="titulo-destacados"
		>
			<div className="envoltura">
				<div className="destacados-encabezado">
					<h2 id="titulo-destacados">
						Nuestros <em>favoritos</em>
					</h2>
					<p>Elegidos por Fresura para que empieces por aquí.</p>
				</div>
				<ul className="fila-productos">
					{destacados.map((producto) => (
						<li key={producto.id}>
							<TarjetaProducto
								producto={producto}
								categorias={contenido.categorias}
								enBeige
								respaldo={respaldo}
							/>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
