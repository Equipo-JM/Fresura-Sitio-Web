import { useRef } from "react";
import { Link } from "react-router";
import type { Contenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";
import { nombreProducto } from "../../compartido/carrito/reglas";
import { FotoEjemplo } from "../../compartido/componentes/FotoEjemplo";
import { promocionesVigentes } from "../../compartido/contenido/vigencia";
import { useCalcomaniaViva } from "../../compartido/movimiento/useCalcomaniaViva";
import { Calcomania } from "../Calcomania";
import { CajaSorpresa } from "../promociones/CajaSorpresa";
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
	// En la página propia los cupones cuelgan del h1: h2, sin saltar niveles.
	const Subtitulo = comoPagina ? "h2" : "h3";
	const vigentes = promocionesVigentes(contenido.promociones);
	if (comoPagina && vigentes.length === 0) return <PromocionesVacias />;
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
					<div
						className={
							comoPagina
								? "titulo-con-calcomania calcomania-promociones"
								: undefined
						}
					>
						<Titulo
							id="titulo-promociones"
							className="promo-titulo"
							tabIndex={-1}
						>
							Promociones
						</Titulo>
						{comoPagina && <Calcomania nombre="ven-date-un-gusto-bonito" />}
					</div>
				</div>
				{vigentes.length === 0 ? (
					<Cupon>
						<Subtitulo>Por ahora no tenemos promociones publicadas</Subtitulo>
					</Cupon>
				) : (
					vigentes.map((p) => (
						<Cupon key={p.id}>
							<Subtitulo>{p.titulo}</Subtitulo>
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

/**
 * /promociones sin promociones vigentes: solo la franja rosa con la caja
 * sorpresa. El h1 queda para lectores de pantalla y para el orden de títulos.
 */
function PromocionesVacias() {
	return (
		<section
			className="seccion fondo-peep promo-vacia-sec"
			id="promociones"
			aria-labelledby="titulo-promociones"
		>
			<h1 id="titulo-promociones" className="oculto" tabIndex={-1}>
				Promociones
			</h1>
			<div className="envoltura promo-vacia">
				<CajaSorpresa>
					<h2>Por ahora no tenemos promociones publicadas</h2>
					<p className="promo-vacia-bajada">Pronto, nuevas sorpresas dulces.</p>
				</CajaSorpresa>
				<Link className="boton" to="/menu">
					Ver el menú
				</Link>
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
	const Subtitulo = comoPagina ? "h2" : "h3";
	const sticker = useRef<HTMLImageElement>(null);
	useCalcomaniaViva(sticker);
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
						ref={sticker}
						className="nosotros-sticker calcomania-viva"
						draggable={false}
						src="/marca/sticker-horizontal.svg"
						alt=""
						width="220"
						height="50"
						loading="lazy"
					/>
					{comoPagina && (
						<Calcomania
							nombre="dulce-pero-con-estilo-gafas"
							className="calcomania-en-foto"
						/>
					)}
				</div>
				<div className="nosotros-texto">
					<Titulo id="titulo-nosotros" tabIndex={-1}>
						Dulce, <em>pero con estilo.</em>
					</Titulo>
					<p>{NOSOTROS.texto}</p>
					<ul className="valores">
						{NOSOTROS.valores.map((v) => (
							<li key={v.titulo}>
								<Subtitulo>{v.titulo}</Subtitulo>
								<p>{v.texto}</p>
							</li>
						))}
					</ul>
				</div>
			</div>
		</section>
	);
}
