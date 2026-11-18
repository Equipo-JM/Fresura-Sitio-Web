import type { Contenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";
import { Icono } from "../../compartido/componentes/Icono";
import { MapaSede } from "../MapaSede";
import { PUBLICACIONES_RECIENTE, RESENAS_GOOGLE, TEXTO_RECIENTE } from "./copy";

/** «Lo más reciente»: las últimas publicaciones de Instagram dentro de polaroids. */
export function LoMasReciente({ contenido }: { contenido: Contenido }) {
	const instagram = contenido.negocio.redes.instagram;
	const usuario = instagram
		? `@${instagram.replace(/\/$/, "").split("/").pop()}`
		: "@fresura";
	return (
		<section
			className="seccion fondo-peep reciente"
			id="reciente"
			aria-labelledby="titulo-reciente"
		>
			<div className="envoltura">
				<div className="reciente-cabeza">
					<div className="reciente-texto">
						<h2 id="titulo-reciente">
							Lo más reciente <span className="salto">de Fresura</span>
						</h2>
						<p>{TEXTO_RECIENTE}</p>
					</div>
					{instagram && (
						<a
							className="boton"
							href={instagram}
							target="_blank"
							rel="noopener noreferrer"
						>
							Seguir a {usuario}
							<span className="oculto">
								, se abre Instagram en otra pestaña
							</span>
						</a>
					)}
				</div>
				<ul className="polaroids">
					{PUBLICACIONES_RECIENTE.map((publicacion, i) => (
						<li className={`polaroid p${i + 1}`} key={publicacion.codigo}>
							<span
								className={`adhesivo cinta-${publicacion.cinta}`}
								aria-hidden="true"
							/>
							<div className="polaroid-foto polaroid-instagram">
								{/* Inserción de Instagram sin su script: solo un iframe perezoso,
								    así el sitio no carga código de terceros (CSP: frame-src). */}
								<iframe
									src={`https://www.instagram.com/reel/${publicacion.codigo}/embed/`}
									title={`Publicación ${i + 1} de ${usuario} en Instagram`}
									loading="lazy"
									allowFullScreen
								/>
							</div>
							<p className="polaroid-pie">
								<a
									href={`https://www.instagram.com/reel/${publicacion.codigo}/`}
									target="_blank"
									rel="noopener noreferrer"
								>
									{usuario}
									<span className="oculto">
										, abre la publicación {i + 1} en Instagram en otra pestaña
									</span>
								</a>
							</p>
						</li>
					))}
				</ul>
				<p className="reciente-otras">
					También estamos en{" "}
					<a
						className="enlace-texto"
						href={contenido.negocio.redes.tiktok ?? undefined}
						target="_blank"
						rel="noopener noreferrer"
					>
						TikTok
					</a>{" "}
					y{" "}
					<a
						className="enlace-texto"
						href={contenido.negocio.redes.facebook ?? undefined}
						target="_blank"
						rel="noopener noreferrer"
					>
						Facebook
					</a>
					.
				</p>
			</div>
		</section>
	);
}

/**
 * Franja de Google con las reseñas de clientes, solo si el contrato la marca como
 * mostrada (RF-12). Por decisión del equipo ya no muestra la calificación numérica,
 * el número de opiniones ni el botón a la ficha: solo una frase y las reseñas.
 */
export function Calificacion({
	opiniones,
}: {
	opiniones: Contenido["opiniones"];
}) {
	if (!opiniones.mostrar) return null;
	return (
		<section
			className="seccion fondo-verde google-sec"
			aria-labelledby="titulo-google"
		>
			<div className="envoltura google">
				<span className="google-logo" aria-hidden="true">
					<img src="/marca/google-g.svg" alt="" width="44" height="44" />
				</span>
				<div className="google-texto">
					<h2 id="titulo-google">Lo que dicen nuestros clientes</h2>
					<p className="google-nota">Reseñas reales en Google</p>
				</div>
			</div>
			<div className="envoltura">
				<ul className="google-resenas">
					{RESENAS_GOOGLE.map((resena) => (
						<li key={resena.autor}>
							<figure className="google-resena">
								<p
									className="google-resena-estrellas"
									role="img"
									aria-label="5 de 5 estrellas"
								>
									{Array.from({ length: 5 }, (_, i) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: cinco estrellas fijas
										<Icono key={i} nombre="estrella" />
									))}
								</p>
								<blockquote>
									<p>{resena.texto}</p>
								</blockquote>
								<figcaption>
									<strong>{resena.autor}</strong> · Reseña en Google
								</figcaption>
							</figure>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}

/** Sedes con su dirección, horario y enlace para llegar. */
export function Sedes({
	contenido,
	pagina = false,
}: {
	contenido: Contenido;
	pagina?: boolean;
}) {
	const TituloSede = pagina ? "h2" : "h3";
	return (
		<section
			className={pagina ? "sedes-pagina" : "seccion con-toldo"}
			id="sedes"
			aria-labelledby={pagina ? undefined : "titulo-sedes"}
			aria-label={pagina ? "Sedes" : undefined}
		>
			<div className="envoltura">
				{!pagina && (
					<div className="capa-encabezado">
						<h2 id="titulo-sedes" tabIndex={-1}>
							Sedes
						</h2>
						<p className="capa-frase">¿Cuál te queda cerca?</p>
						<p className="capa-dato">Mismos productos y precios en ambas.</p>
					</div>
				)}
				<div className="sedes-grid">
					{contenido.negocio.sedes.map((sede) => (
						<article className="sede" key={sede.id}>
							<div className="sede-mapa">
								<MapaSede
									nombre={sede.nombre}
									ubicacion={sede.ubicacion}
									// La zona de 5 km no cabe con el acercamiento de calle: la
									// sede que atiende domicilios se muestra un poco más lejos.
									zoom={sede.atiende_pedidos ? 12 : 16}
									radioKm={
										sede.atiende_pedidos ? sede.radio_domicilio_km : null
									}
								/>
							</div>
							<div className="sede-cuerpo">
								<TituloSede>{sede.nombre}</TituloSede>
								<p className="etiqueta-sede">
									{sede.atiende_pedidos ? (
										<>
											Recogida y domicilios hasta {sede.radio_domicilio_km} km
											en línea recta
										</>
									) : (
										"Punto de venta"
									)}
								</p>
								<p>{sede.direccion}, Bogotá</p>
								<table className="horario">
									<caption className="oculto">Horario</caption>
									<tbody>
										{sede.horarios
											.flatMap((h) => {
												const [horas, almuerzo] = h.horas.split(
													" Cierre por almuerzo: ",
												);
												return almuerzo
													? [
															{ dias: h.dias, horas },
															{ dias: "Cierre por almuerzo", horas: almuerzo },
														]
													: [h];
											})
											.map((h) => (
												<tr key={h.dias}>
													<th scope="row">{h.dias}</th>
													<td>{h.horas}</td>
												</tr>
											))}
									</tbody>
								</table>
								<a
									className="enlace"
									aria-label={`Cómo llegar a la sede ${sede.nombre.replace(/^Sede /, "")}, se abre en otra pestaña`}
									href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${sede.direccion}, Bogotá, Colombia`)}`}
									target="_blank"
									rel="noopener noreferrer"
								>
									Cómo llegar
									<span className="oculto">
										{" "}
										a la sede {sede.nombre.replace(/^Sede /, "")}, se abre en
										otra pestaña
									</span>
								</a>
							</div>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}

/**
 * Preguntas frecuentes con desplegable, desde el contrato. `comoPagina` usa el
 * título como la `h1` de /ayuda.
 */
export function Preguntas({
	contenido,
	comoPagina = false,
}: {
	contenido: Contenido;
	comoPagina?: boolean;
}) {
	const Titulo = comoPagina ? "h1" : "h2";
	const preguntas = [...contenido.preguntas_frecuentes].sort(
		(a, b) => a.orden - b.orden,
	);
	return (
		<section
			className="seccion fondo-dust"
			id="ayuda"
			aria-labelledby="titulo-ayuda"
		>
			<div className="envoltura">
				<div className="preguntas">
					<Titulo id="titulo-ayuda" tabIndex={-1}>
						Preguntas frecuentes
					</Titulo>
					{preguntas.map((p) => (
						<details key={p.id}>
							<summary>
								{p.pregunta}
								<Icono nombre="abajo" />
							</summary>
							<p>{p.respuesta}</p>
						</details>
					))}
				</div>
			</div>
		</section>
	);
}
