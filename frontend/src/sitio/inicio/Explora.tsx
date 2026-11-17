import { Link } from "react-router";

/** Páginas del sitio en el orden del menú; las comparten el inicio y el pie (RF-02). */
export const PAGINAS_SITIO = [
	{ ruta: "/menu", texto: "Menú" },
	{ ruta: "/promociones", texto: "Promociones" },
	{ ruta: "/nosotros", texto: "Nosotros" },
	{ ruta: "/sedes", texto: "Sedes" },
	{ ruta: "/ayuda", texto: "Ayuda" },
] as const;

/** Franja del inicio con accesos a las demás páginas del sitio. */
export function Explora() {
	return (
		<section
			className="seccion fondo-dust"
			id="explora"
			aria-labelledby="titulo-explora"
		>
			<div className="envoltura">
				<h2 id="titulo-explora">Explora Fresura</h2>
				<ul className="acciones-fila">
					{PAGINAS_SITIO.map((p, i) => (
						<li key={p.ruta}>
							<Link
								className={i === 0 ? "boton" : "boton secundario"}
								to={p.ruta}
							>
								{p.texto}
							</Link>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
