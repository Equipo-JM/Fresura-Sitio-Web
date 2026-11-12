import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router";
import { unidadesCarrito } from "../compartido/carrito/unidades";
import { useCarrito } from "../compartido/carrito/useCarrito";
import { Icono } from "../compartido/componentes/Icono";
import { useContenido } from "../compartido/contenido/useContenido";
import { useDesplazamientoSuave } from "../compartido/movimiento/useDesplazamientoSuave";
import { MarcaPorValidar } from "./MarcaPorValidar";

/** Enlaces de la navegación, en el orden de la referencia (menú, ¿Qué pido?, Nosotros, Sedes, Ayuda). */
const SECCIONES = [
	{ id: "menu", texto: "Menú" },
	{ id: "antojos", texto: "¿Qué pido?" },
	{ id: "nosotros", texto: "Nosotros" },
	{ id: "sedes", texto: "Sedes" },
	{ id: "ayuda", texto: "Ayuda" },
] as const;

/**
 * Estructura común de las páginas públicas: encabezado con navegación y carrito,
 * pie con contacto y redes. El desplazamiento suave se activa aquí para todo el sitio.
 */
export function MarcoDelSitio() {
	useDesplazamientoSuave();
	const [menuAbierto, setMenuAbierto] = useState(false);
	const { lineas } = useCarrito();
	const unidades = unidadesCarrito(lineas);
	const { data } = useContenido();
	const contenido = data?.contenido;

	return (
		<>
			<a className="saltar" href="#contenido">
				Saltar al contenido
			</a>
			<header className="sitio-h">
				<div className="envoltura fila">
					<Link className="logo" to="/" aria-label="Fresura, ir al inicio">
						<img
							src="/marca/logo-horizontal-color.svg"
							alt=""
							width="150"
							height="27"
						/>
					</Link>
					<nav
						className={menuAbierto ? "nav abierta" : "nav"}
						aria-label="Principal"
						data-lenis-prevent
					>
						<ul className="raiz">
							{SECCIONES.map((s) => (
								<li key={s.id}>
									<Link to={`/#${s.id}`} onClick={() => setMenuAbierto(false)}>
										{s.texto}
									</Link>
								</li>
							))}
						</ul>
					</nav>
					<NavLink
						className="carrito-enlace"
						to="/carrito"
						aria-label={`Carrito, ${unidades} ${unidades === 1 ? "unidad" : "unidades"}`}
					>
						<Icono nombre="carrito" />
						<span className="carrito-texto">Carrito</span>
						<span className="contador">{unidades}</span>
					</NavLink>
					<button
						type="button"
						className="hamburguesa"
						aria-expanded={menuAbierto}
						aria-controls="nav-principal"
						aria-label={menuAbierto ? "Cerrar navegación" : "Abrir navegación"}
						onClick={() => setMenuAbierto((abierto) => !abierto)}
					>
						<Icono nombre={menuAbierto ? "cerrar" : "menu"} />
					</button>
				</div>
				<div className="toldo" aria-hidden="true" />
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
						<div>
							<h2>Contacto</h2>
							<ul>
								<li>
									<a
										href={`https://wa.me/${contenido?.negocio.whatsapp ?? ""}`}
									>
										WhatsApp
									</a>
									{contenido?.estado === "ejemplo" && <MarcaPorValidar />}
								</li>
								<li>
									<Link to="/#sedes">Sedes y contacto</Link>
								</li>
							</ul>
						</div>
						<div>
							<h2>Redes</h2>
							<ul>{contenido && <Redes redes={contenido.negocio.redes} />}</ul>
						</div>
						<div>
							<h2>Sedes</h2>
							<ul>
								{contenido?.negocio.sedes.map((s) => (
									<li key={s.id}>
										{s.nombre}: {s.direccion}
									</li>
								))}
							</ul>
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

/** Enlaces a las redes que tengan dirección publicada. */
function Redes({
	redes,
}: {
	redes: {
		instagram: string | null;
		tiktok: string | null;
		facebook: string | null;
	};
}) {
	const lista = [
		["Instagram", redes.instagram],
		["TikTok", redes.tiktok],
		["Facebook", redes.facebook],
	] as const;
	return (
		<>
			{lista
				.filter(([, url]) => url !== null)
				.map(([nombre, url]) => (
					<li key={nombre}>
						<a
							href={url ?? undefined}
							target="_blank"
							rel="noopener noreferrer"
						>
							{nombre}
						</a>
					</li>
				))}
		</>
	);
}
