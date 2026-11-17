import { Link } from "react-router";
import type { Contenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";
import { nombreProducto } from "../../compartido/carrito/reglas";
import { FotoEjemplo } from "../../compartido/componentes/FotoEjemplo";
import { promocionesVigentes } from "../../compartido/contenido/vigencia";
import { MarcaPorValidar } from "../MarcaPorValidar";
import { NOSOTROS } from "./copy";

/**
 * Promociones vigentes hoy en Colombia, con su vigencia, productos y condiciones
 * (RNF-16). Las vencidas o futuras se quedan en el panel sin mostrarse.
 * `comoPagina` usa el título como la `h1` de /promociones.
 */
export function Promociones({
	contenido,
	comoPagina = false,
}: {
	contenido: Contenido;
	comoPagina?: boolean;
}) {
	const Titulo = comoPagina ? "h1" : "h2";
	const vigentes = promocionesVigentes(contenido.promociones);
	return (
		<section
			className="seccion fondo-flamingo"
			id="promociones"
			aria-labelledby="titulo-promociones"
		>
			<img
				className="deco promo-patron"
				src="/marca/patron-fresas-we-peep.svg"
				alt=""
			/>
			<div className="envoltura promo-grid">
				<div>
					<Titulo
						id="titulo-promociones"
						className="promo-titulo"
						tabIndex={-1}
					>
						Promociones
					</Titulo>
				</div>
				{vigentes.length === 0 ? (
					<Cupon>
						<h3>Por ahora no tenemos promociones publicadas</h3>
					</Cupon>
				) : (
					vigentes.map((p) => (
						<Cupon key={p.id}>
							<h3>{p.titulo}</h3>
							{contenido.estado === "ejemplo" && <MarcaPorValidar />}
							<p>
								<strong>Vigencia:</strong> {p.vigencia.desde} a{" "}
								{p.vigencia.hasta}.
							</p>
							<p>
								<strong>Productos:</strong>{" "}
								{contenido.productos
									.filter((producto) => p.productos.includes(producto.id))
									.map((producto) =>
										nombreProducto(producto, contenido.categorias),
									)
									.join(", ")}
								.
							</p>
							<p>
								<strong>Condiciones:</strong> {p.condiciones}
							</p>
						</Cupon>
					))
				)}
			</div>
		</section>
	);
}

function Cupon({ children }: { children: React.ReactNode }) {
	return (
		<article className="cupon">
			<div className="cupon-rayas" aria-hidden="true" />
			<div className="cupon-cuerpo">
				{children}
				<Link className="boton" to="/menu">
					Ver el menú
				</Link>
			</div>
		</article>
	);
}

/**
 * Historia y valores del rediseño; la fotografía conserva su aviso de ejemplo.
 * `comoPagina` usa el título como la `h1` de /nosotros.
 */
export function Nosotros({ comoPagina = false }: { comoPagina?: boolean }) {
	const Titulo = comoPagina ? "h1" : "h2";
	return (
		<section
			className="seccion fondo-peep"
			id="nosotros"
			aria-labelledby="titulo-nosotros"
		>
			<img
				className="deco nosotros-trazo"
				src="/marca/trazo-3-flamingo.svg"
				alt=""
			/>
			<div className="envoltura nosotros-grid">
				<div className="nosotros-foto">
					<span className="pv pv-foto">Por validar</span>
					<div className="arco">
						<FotoEjemplo
							src="/ejemplos/nosotros-interior.webp"
							alt="Interior cálido con el nombre Fresura en un arco y dos sillones rosados"
							ancho={600}
							alto={900}
							marcada={false}
						/>
					</div>
					<img
						className="nosotros-sticker"
						src="/marca/sticker-horizontal.svg"
						alt=""
						width="220"
						height="50"
						loading="lazy"
					/>
				</div>
				<div className="nosotros-texto">
					<Titulo id="titulo-nosotros" tabIndex={-1}>
						Dulce, <em>pero con estilo.</em>
					</Titulo>
					<p>{NOSOTROS.texto}</p>
					<ul className="valores">
						{NOSOTROS.valores.map((v) => (
							<li key={v.titulo}>
								<h3>{v.titulo}</h3>
								<p>{v.texto}</p>
							</li>
						))}
					</ul>
				</div>
			</div>
		</section>
	);
}
