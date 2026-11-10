import { Link, Outlet } from "react-router";

/**
 * Estructura común de las páginas públicas: enlace para saltar al contenido,
 * encabezado con el logotipo y pie. La navegación por secciones se agrega
 * cuando existan el catálogo y las demás secciones (DD-34).
 *
 * Logotipos: a color sobre Platinum en el encabezado y Court-Bouillon sobre
 * Peat Brown en el pie, combinaciones aprobadas en M1 p.13.
 */
export function MarcoDelSitio() {
	return (
		<>
			<a className="saltar" href="#contenido">
				Saltar al contenido
			</a>
			<header className="sitio-encabezado">
				<div className="envoltura fila">
					<Link className="logo" to="/" aria-label="Fresura, ir al inicio">
						<img
							src="/marca/logo-horizontal-color.svg"
							alt=""
							width="150"
							height="27"
						/>
					</Link>
				</div>
			</header>
			<main id="contenido" tabIndex={-1}>
				<Outlet />
			</main>
			<footer className="pie oscuro">
				<div className="envoltura">
					<div className="pie-grid">
						<div>
							<img
								className="pie-logo"
								src="/marca/logo-vertical-court-bouillon.svg"
								alt="Fresura"
								width="200"
								height="97"
							/>
							<p className="ligero">
								Dulce, <span className="negrita">pero con estilo.</span>
							</p>
						</div>
					</div>
					<p className="pie-legal">
						<Link to="/privacidad">Política de datos</Link>
					</p>
				</div>
			</footer>
		</>
	);
}
