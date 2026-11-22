import type { CSSProperties } from "react";
import { Link } from "react-router";
import type { Contenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";
import { nombreProducto } from "../../compartido/carrito/reglas";
import {
	avisoDias,
	diasRestantes,
	fechasLegibles,
	separarTitulo,
} from "./cupon";

type Promocion = Contenido["promociones"][number];

/**
 * Una promoción vigente como cupón: la oferta en grande, la vigencia en
 * palabras, los productos, las condiciones tras la línea de corte y el
 * enlace al menú. `orden` escalona su entrada con las demás.
 */
export function CuponPromocion({
	promocion,
	contenido,
	hoy,
	orden,
	Titulo,
}: {
	promocion: Promocion;
	contenido: Contenido;
	hoy: string;
	orden: number;
	Titulo: "h2" | "h3";
}) {
	const { oferta, resto } = separarTitulo(promocion.titulo);
	const aviso = avisoDias(diasRestantes(promocion.vigencia.hasta, hoy));
	const productos = contenido.productos.filter((producto) =>
		promocion.productos.includes(producto.id),
	);
	return (
		<article
			className="cupon-promo"
			style={{ "--orden": orden } as CSSProperties}
		>
			<div className="cupon-promo-cabeza">
				<span className="cupon-promo-icono" aria-hidden="true">
					<img
						className="cupon-promo-fresa"
						src="/marca/fresa-we-peep.svg"
						alt=""
					/>
				</span>
				<span
					className={
						aviso.urgente
							? "cupon-promo-aviso cupon-promo-urgente"
							: "cupon-promo-aviso"
					}
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<circle cx="12" cy="13" r="8" />
						<path d="M12 9v4l2.5 2M9 2h6" />
					</svg>
					{aviso.texto}
				</span>
			</div>
			<div className="cupon-promo-cuerpo">
				<Titulo className="cupon-promo-titulo">
					<span className="cupon-promo-oferta">{oferta}</span>
					{resto && (
						<>
							{" "}
							<span className="cupon-promo-resto">{resto}</span>
						</>
					)}
				</Titulo>
				<p className="cupon-promo-fechas">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<rect x="3" y="5" width="18" height="16" rx="3" />
						<path d="M3 10h18M8 3v4M16 3v4" />
					</svg>
					<span>
						<span className="oculto">Vigencia: </span>
						{fechasLegibles(promocion.vigencia.desde, promocion.vigencia.hasta)}
					</span>
				</p>
				{productos.length > 0 && (
					<ul
						className="cupon-promo-productos"
						aria-label="Productos de la promoción"
					>
						{productos.map((producto) => (
							<li key={producto.id}>
								<img
									className="cupon-promo-chip-fresa"
									src="/marca/fresa-flamingo.svg"
									alt=""
								/>
								{nombreProducto(producto, contenido.categorias)}
							</li>
						))}
					</ul>
				)}
				<div className="cupon-promo-lado">
					<div className="cupon-promo-corte" aria-hidden="true">
						<span />
						<span />
					</div>
					<p className="cupon-promo-condiciones">
						<span className="oculto">Condiciones: </span>
						{promocion.condiciones}
					</p>
					<Link className="boton cupon-promo-boton" to="/menu">
						Pedirla desde el menú
						<svg
							className="cupon-promo-flecha"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<path d="M5 12h14M13 6l6 6-6 6" />
						</svg>
					</Link>
				</div>
			</div>
		</article>
	);
}
