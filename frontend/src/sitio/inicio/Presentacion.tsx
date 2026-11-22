import { useRef } from "react";
import { Link } from "react-router";
import type { Contenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";
import { FotoEjemplo } from "../../compartido/componentes/FotoEjemplo";
import {
	fechaColombia,
	promocionesVigentes,
} from "../../compartido/contenido/vigencia";
import { useCalcomaniaViva } from "../../compartido/movimiento/useCalcomaniaViva";
import { Calcomania } from "../Calcomania";
import { CajaAbierta } from "../promociones/CajaAbierta";
import { CajaSorpresa } from "../promociones/CajaSorpresa";
import { CuponPromocion } from "../promociones/CuponPromocion";
import { NOSOTROS } from "./copy";

/**
 * Promociones vigentes hoy en Colombia, cada una como cupón con su vigencia,
 * productos y condiciones (RNF-16). Las vencidas o futuras se quedan en el
 * panel sin mostrarse; sin ninguna vigente se muestra la caja sorpresa
 * cerrada. `comoPagina` usa el título como la `h1` de /promociones.
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
	const hoy = fechaColombia();
	const vigentes = promocionesVigentes(contenido.promociones, hoy);
	if (vigentes.length === 0) return <PromocionesVacias />;
	// Hasta tres columnas: con una o dos promociones los cupones se reparten
	// el ancho en lugar de dejar huecos a los lados.
	const columnas = Math.min(vigentes.length, 3);
	return (
		<section
			className="seccion fondo-peep promos"
			id="promociones"
			aria-labelledby="titulo-promociones"
		>
			<div className="envoltura">
				<div className="promos-encabezado">
					<div>
						<Titulo id="titulo-promociones" tabIndex={-1}>
							Promociones
						</Titulo>
						<p className="promos-conteo">
							{vigentes.length === 1
								? "1 promoción vigente"
								: `${vigentes.length} promociones vigentes`}
						</p>
					</div>
					<CajaAbierta />
				</div>
				<div className={`promos-cupones promos-columnas-${columnas}`}>
					{vigentes.map((promocion, i) => (
						<CuponPromocion
							key={promocion.id}
							promocion={promocion}
							contenido={contenido}
							hoy={hoy}
							orden={i}
							Titulo={Subtitulo}
						/>
					))}
				</div>
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
