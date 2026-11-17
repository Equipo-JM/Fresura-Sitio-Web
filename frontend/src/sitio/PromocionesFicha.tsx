import type { Contenido } from "../../../backend/supabase/functions/_shared/esquemas/contenido";
import { promocionesVigentes } from "../compartido/contenido/vigencia";

const FECHA = new Intl.DateTimeFormat("es-CO", {
	day: "numeric",
	month: "long",
	year: "numeric",
});

/** Vigencia legible, por ejemplo «Del 3 de noviembre de 2026 al 24 de noviembre de 2026». */
export function textoVigencia(desde: string, hasta: string): string {
	// Mediodía: evita que la zona horaria corra la fecha al día anterior.
	const fecha = (dia: string) => FECHA.format(new Date(`${dia}T12:00:00`));
	return `Del ${fecha(desde)} al ${fecha(hasta)}`;
}

/**
 * Promociones vigentes hoy que incluyen el producto, con su vigencia y
 * condiciones (RNF-16). Sin promociones vigentes no muestra nada.
 */
export function PromocionesFicha({
	contenido,
	idProducto,
}: {
	contenido: Contenido;
	idProducto: string;
}) {
	const promos = promocionesVigentes(contenido.promociones).filter((p) =>
		p.productos.includes(idProducto),
	);
	if (promos.length === 0) return null;
	return (
		<section className="ficha-promos" aria-labelledby="titulo-ficha-promos">
			<h2 id="titulo-ficha-promos" className="ficha-promos-etiqueta">
				Promoción vigente
			</h2>
			{promos.map((p) => (
				<article className="promo-mini" key={p.id}>
					<h3>{p.titulo}</h3>
					<p>{textoVigencia(p.vigencia.desde, p.vigencia.hasta)}.</p>
					<p>{p.condiciones}</p>
				</article>
			))}
		</section>
	);
}
