import { RESENAS_GOOGLE } from "../../sitio/inicio/copy";
import { FichaPanel } from "../FichaPanel";
import { Campo, Casilla, useEdicion } from "./Campos";

/** Comparte con el sitio los testimonios publicados y su atribución. */
export function ResenasPublicadas({
	resenas = RESENAS_GOOGLE,
	editables = false,
}: {
	resenas?: typeof RESENAS_GOOGLE;
	editables?: boolean;
}) {
	return (
		<section className="panel-resenas">
			<h3>Lo que dicen nuestros clientes</h3>
			<ul>
				{resenas.map((r, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: la posición de la reseña se mantiene al editar su autor y su texto.
					<li key={i}>
						<span role="img" aria-label={`${r.estrellas} de 5 estrellas`}>
							{"★".repeat(Math.max(0, Math.min(5, r.estrellas || 0)))}
						</span>
						<blockquote>{r.texto}</blockquote>
						<p>
							<strong>{r.autor}</strong> · Reseña en Google
						</p>
						{editables && (
							<FichaPanel seccion="Opiniones" titulo={`Editar reseña ${i + 1}`}>
								<Campo
									ruta={`opiniones.resenas.${i}.autor`}
									etiqueta="Autor"
									maximo={120}
								/>
								<Campo
									ruta={`opiniones.resenas.${i}.texto`}
									etiqueta="Texto de la reseña"
									tipo="textarea"
									maximo={2000}
								/>
								<Campo
									ruta={`opiniones.resenas.${i}.estrellas`}
									etiqueta="Estrellas (de 1 a 5)"
									tipo="number"
								/>
							</FichaPanel>
						)}
					</li>
				))}
			</ul>
		</section>
	);
}
/** Datos de la ficha pública: al mostrarlos, el contrato exige completar los cuatro. */
export function Opiniones() {
	const {
		contenido: { opiniones },
	} = useEdicion();
	return (
		<section aria-labelledby="titulo-opiniones">
			<h2 id="titulo-opiniones">Opiniones</h2>
			<FichaPanel
				seccion="Opiniones"
				titulo="Reseñas de Google"
				resumen={
					opiniones.mostrar
						? opiniones.calificacion +
							" de 5 · " +
							opiniones.numero_opiniones +
							" opiniones"
						: "Ocultas en el sitio"
				}
			>
				<Casilla ruta="opiniones.mostrar" etiqueta="Mostrar opiniones" />
				<Campo
					ruta="opiniones.calificacion"
					etiqueta="Calificación (de 1 a 5)"
					tipo="number"
					opcional
				/>
				<Campo
					ruta="opiniones.numero_opiniones"
					etiqueta="Número de opiniones"
					tipo="number"
					opcional
				/>
				<Campo
					ruta="opiniones.fecha_corte"
					etiqueta="Fecha de corte"
					tipo="date"
					opcional
				/>
				<Campo
					ruta="opiniones.url_ficha"
					etiqueta="Enlace a la ficha"
					tipo="url"
					opcional
				/>
			</FichaPanel>
			<ResenasPublicadas resenas={opiniones.resenas} editables />
		</section>
	);
}
