import { Link } from "react-router";
import type { Contenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";
import { Icono } from "../../compartido/componentes/Icono";
import { promocionesVigentes } from "../../compartido/contenido/vigencia";
import { Calcomania } from "../Calcomania";

/** Páginas del sitio en el orden del menú; las comparten el encabezado y el pie (RF-02). */
export const PAGINAS_SITIO = [
	{ ruta: "/menu", texto: "Menú" },
	{ ruta: "/promociones", texto: "Promociones" },
	{ ruta: "/nosotros", texto: "Nosotros" },
	{ ruta: "/sedes", texto: "Sedes" },
	{ ruta: "/ayuda", texto: "Ayuda" },
] as const;

type Tarjeta = {
	ruta: string;
	titulo: string;
	bajada: string;
	ilustracion: string;
	etiqueta?: string;
};

/** Texto de la tarjeta de Promociones según las vigentes hoy: nunca promete lo que no hay. */
export function textoPromociones(vigentes: number): {
	etiqueta?: string;
	bajada: string;
} {
	if (vigentes === 0) return { bajada: "Pronto, nuevas sorpresas dulces." };
	return {
		etiqueta:
			vigentes === 1
				? "¡Hay 1 promo activa!"
				: `¡Hay ${vigentes} promos activas!`,
		bajada: "Antójate antes de que se acaben.",
	};
}

/**
 * Franja del inicio con accesos a las demás páginas: el menú como tarjeta
 * principal y las otras cuatro en cuadrícula. Promociones no aparece con el
 * contenido de respaldo, igual que en la navegación.
 */
export function Explora({
	contenido,
	respaldo = false,
}: {
	contenido: Contenido;
	respaldo?: boolean;
}) {
	const promos = textoPromociones(
		promocionesVigentes(contenido.promociones).length,
	);
	const tarjetas: Tarjeta[] = [
		...(respaldo
			? []
			: [
					{
						ruta: "/promociones",
						titulo: "Promociones",
						ilustracion: "/marca/sticker-sello.svg",
						...promos,
					},
				]),
		{
			ruta: "/nosotros",
			titulo: "Nosotros",
			bajada: "Dulce, pero con estilo.",
			ilustracion: "/marca/fresa-flamingo.svg",
		},
		{
			ruta: "/sedes",
			titulo: "Sedes",
			bajada: "Dónde encontrarnos y a qué hora.",
			ilustracion: "/marca/trazo-3-flamingo.svg",
		},
		{
			ruta: "/ayuda",
			titulo: "Ayuda",
			bajada: "Resolvemos tus dudas.",
			ilustracion: "/marca/fresa-porcini.svg",
		},
	];

	return (
		<section
			className="seccion explora"
			id="explora"
			aria-labelledby="titulo-explora"
		>
			<div className="envoltura">
				<div className="titulo-con-calcomania calcomania-explora">
					<h2 id="titulo-explora">
						Todo Fresura, <em>a un toque</em>
					</h2>
					<Calcomania nombre="fresas-con-crema-chocolate-y-flow" />
				</div>
				<ul
					className={
						respaldo ? "explora-tarjetas sin-promos" : "explora-tarjetas"
					}
				>
					<li>
						<Link className="explora-tarjeta principal" to="/menu">
							<img
								className="explora-ilustracion"
								src="/marca/simbolo-color.svg"
								alt=""
								width="110"
								height="110"
							/>
							<strong>Nuestro menú</strong>
							<span className="explora-bajada">
								Fresitas, Fresotas, Fresuras y más, para armar a tu manera.
							</span>
							<span className="explora-flecha" aria-hidden="true">
								<Icono nombre="derecha" />
							</span>
						</Link>
					</li>
					{tarjetas.map((t) => (
						<li key={t.ruta}>
							<Link className="explora-tarjeta" to={t.ruta}>
								<img
									className="explora-ilustracion"
									src={t.ilustracion}
									alt=""
									width="64"
									height="64"
								/>
								{t.etiqueta && (
									<span className="explora-etiqueta">{t.etiqueta}</span>
								)}
								<strong>{t.titulo}</strong>
								<span className="explora-bajada">{t.bajada}</span>
								<span className="explora-flecha" aria-hidden="true">
									<Icono nombre="derecha" />
								</span>
							</Link>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
