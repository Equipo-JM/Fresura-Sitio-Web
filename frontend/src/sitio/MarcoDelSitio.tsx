import { useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { unidadesCarrito } from "../compartido/carrito/unidades";
import { useCarrito } from "../compartido/carrito/useCarrito";
import { Icono } from "../compartido/componentes/Icono";
import { useContenido } from "../compartido/contenido/useContenido";
import {
	useAperturaAnimada,
	useDesplegablesSuaves,
} from "../compartido/movimiento/useAperturaAnimada";
import { useCortinaEntrePaginas } from "../compartido/movimiento/useCortinaEntrePaginas";
import { useDesplazamientoAlNavegar } from "../compartido/movimiento/useDesplazamientoAlNavegar";
import { useDesplazamientoSuave } from "../compartido/movimiento/useDesplazamientoSuave";
import { useRevelarAlDesplazar } from "../compartido/movimiento/useRevelarAlDesplazar";
import { AvisoRespaldo } from "./AvisoRespaldo";
import { PAGINAS_SITIO } from "./inicio/Explora";
import { useMomentosDesplazamiento } from "./inicio/useMomentosDesplazamiento";
import { useCierreNavegacion } from "./useCierreNavegacion";
import { useTituloPagina } from "./useTituloPagina";

/** Colores de las fresas que caen sobre el pie al llegar al final de la página. */
const FRESAS_LLUVIA = [
	"flamingo",
	"we-peep",
	"porcini",
	"flamingo",
	"we-peep",
	"porcini",
	"flamingo",
	"we-peep",
	"flamingo",
	"porcini",
] as const;

/** Páginas de la navegación después del desplegable «Menú»: cada opción abre su propia página (RF-02). */
const SECCIONES = PAGINAS_SITIO.filter((p) => p.ruta !== "/menu");

/**
 * Estructura común de las páginas públicas: encabezado con navegación y carrito,
 * pie con contacto y redes. El desplazamiento suave y la posición al cambiar de
 * ruta se controlan aquí para todo el sitio.
 */
export function MarcoDelSitio() {
	useTituloPagina();
	useDesplazamientoSuave();
	useDesplazamientoAlNavegar();
	const [menuAbierto, setMenuAbierto] = useState(false);
	const [categoriasAbiertas, setCategoriasAbiertas] = useState(false);
	const { pathname } = useLocation();
	const botonMenu = useRef<HTMLButtonElement>(null);
	const botonNavegacion = useRef<HTMLButtonElement>(null);
	const { lineas } = useCarrito();
	const unidades = unidadesCarrito(lineas);
	const { data } = useContenido();
	const contenido = data?.contenido;
	const respaldo = data?.origen === "respaldo";
	const principal = useRef<HTMLElement>(null);
	useMomentosDesplazamiento(principal, pathname, Boolean(contenido));
	useRevelarAlDesplazar(pathname, Boolean(contenido));
	useDesplegablesSuaves();
	useAperturaAnimada(menuAbierto, "#nav-principal .raiz > li");
	useAperturaAnimada(categoriasAbiertas, "#desplegable > li");
	const cortina = useRef<HTMLDivElement>(null);
	useCortinaEntrePaginas(cortina, pathname);
	const compra =
		!respaldo &&
		(pathname === "/carrito" || pathname.startsWith("/personalizar/"));
	function cerrarMenu() {
		setMenuAbierto(false);
		setCategoriasAbiertas(false);
	}
	useCierreNavegacion(
		menuAbierto || categoriasAbiertas,
		menuAbierto,
		botonMenu,
		botonNavegacion,
		cerrarMenu,
	);

	return (
		<>
			<a className="saltar" href="#contenido">
				Saltar al contenido
			</a>
			{pathname === "/" && contenido && (
				<div className="anuncio">
					<div className="envoltura">
						<p>
							<img
								src="/marca/fresa-flamingo.svg"
								alt=""
								width="12"
								height="17"
							/>
							Domicilios desde{" "}
							<strong>
								{contenido.negocio.sedes
									.find((s) => s.atiende_pedidos)
									?.nombre.replace(/^Sede /, "")}
							</strong>
							, hasta 5 km
						</p>
						<a
							className="anuncio-enlace"
							href={`https://wa.me/${contenido.negocio.whatsapp}`}
						>
							<Icono nombre="chat" />
							Escríbenos
						</a>
					</div>
				</div>
			)}
			<header className={compra ? "compra-h" : "sitio-h"}>
				<div className="envoltura fila">
					<Link className="logo" to="/" aria-label="Fresura, ir al inicio">
						<img
							src="/marca/logo-horizontal-color.svg"
							alt=""
							width="150"
							height="27"
						/>
					</Link>
					{compra ? (
						<Link className="compra-volver" to="/menu">
							<Icono nombre="atras" />
							{pathname === "/carrito" ? "Seguir comprando" : "Volver al menú"}
						</Link>
					) : (
						<nav
							id="nav-principal"
							className={menuAbierto ? "nav abierta" : "nav"}
							aria-label="Principal"
							data-lenis-prevent
						>
							<ul className="raiz">
								<li className="menu-item">
									<span className="menu-etiqueta">Menú</span>
									<button
										className="abrir-menu"
										ref={botonMenu}
										type="button"
										aria-expanded={categoriasAbiertas}
										aria-controls="desplegable"
										onClick={() => setCategoriasAbiertas((a) => !a)}
									>
										Menú <Icono nombre="abajo" />
									</button>
									<ul
										className="desplegable"
										id="desplegable"
										hidden={!categoriasAbiertas}
									>
										<li>
											<Link to="/menu" onClick={cerrarMenu}>
												Todo el menú
											</Link>
										</li>
										{contenido?.categorias.map((c) => (
											<li key={c.id}>
												<Link to={`/menu#cat-${c.id}`} onClick={cerrarMenu}>
													{c.nombre}
												</Link>
											</li>
										))}
									</ul>
								</li>
								{SECCIONES.filter(
									(s) => s.ruta !== "/promociones" || !respaldo,
								).map((s) => (
									<li key={s.ruta}>
										<NavLink to={s.ruta} onClick={cerrarMenu}>
											{s.texto}
										</NavLink>
									</li>
								))}
							</ul>
						</nav>
					)}
					{pathname !== "/carrito" && (
						<NavLink
							className="carrito-enlace"
							onClick={(evento) => {
								if (respaldo) evento.preventDefault();
							}}
							to="/carrito"
							aria-disabled={respaldo || undefined}
							aria-label={
								respaldo
									? "Carrito desactivado, consulta por WhatsApp"
									: `Carrito, ${unidades} ${unidades === 1 ? "unidad" : "unidades"}`
							}
						>
							<Icono nombre="carrito" />
							{!compra && <span className="carrito-texto">Carrito</span>}
							{!respaldo && <span className="contador">{unidades}</span>}
						</NavLink>
					)}
					{!compra && (
						<button
							type="button"
							className="hamburguesa"
							ref={botonNavegacion}
							aria-expanded={menuAbierto}
							aria-controls="nav-principal"
							aria-label={
								menuAbierto ? "Cerrar navegación" : "Abrir navegación"
							}
							onClick={() => setMenuAbierto((abierto) => !abierto)}
						>
							<Icono nombre={menuAbierto ? "cerrar" : "menu"} />
						</button>
					)}
				</div>
				<div className="toldo" aria-hidden="true" />
			</header>
			{respaldo && contenido && (
				<AvisoRespaldo whatsapp={contenido.negocio.whatsapp} />
			)}

			<main id="contenido" tabIndex={-1} ref={principal}>
				<Outlet />
			</main>

			{!compra && (
				<footer className="pie oscuro">
					<div className="pie-lluvia" aria-hidden="true">
						{FRESAS_LLUVIA.map((color, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: lista fija decorativa
							<img key={i} src={`/marca/fresa-${color}.svg`} alt="" />
						))}
					</div>
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
									</li>
									<li>
										<Link to="/sedes">Sedes y contacto</Link>
									</li>
								</ul>
							</div>
							<nav aria-label="Explora">
								<h2>Explora</h2>
								<ul>
									{PAGINAS_SITIO.map((p) => (
										<li key={p.ruta}>
											<Link to={p.ruta}>{p.texto}</Link>
										</li>
									))}
								</ul>
							</nav>
							<div>
								<h2>Redes</h2>
								<ul>
									{contenido && <Redes redes={contenido.negocio.redes} />}
								</ul>
							</div>
							<div>
								<h2>Sedes</h2>
								<ul>
									{contenido?.negocio.sedes.map((s) => (
										<li key={s.id}>
											{s.nombre.replace(/^Sede /, "")}: {s.direccion}
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
			)}
			<div className="cortina-pagina" ref={cortina} aria-hidden="true">
				<img src="/marca/fresa-we-peep.svg" alt="" width="84" height="119" />
			</div>
			{!compra && contenido && (
				// En celular es un círculo con el ícono: la píldora con texto tapaba
				// precios, horarios y botones (revisión en 360 px, 17 nov).
				<a
					className="boton wa-flotante"
					href={`https://wa.me/${contenido.negocio.whatsapp}`}
				>
					<Icono nombre="chat" />
					<span className="oculto">WhatsApp</span>
				</a>
			)}
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
