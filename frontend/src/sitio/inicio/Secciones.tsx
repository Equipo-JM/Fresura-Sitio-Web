import type { Contenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";
import { Icono } from "../../compartido/componentes/Icono";
import { PUBLICACIONES_RECIENTE, TEXTO_RECIENTE } from "./copy";

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

/** Calificación de Google, solo si el contrato la marca como mostrada (RF-12). */
export function Calificacion({
	opiniones,
}: {
	opiniones: Contenido["opiniones"];
}) {
	if (!opiniones.mostrar || opiniones.calificacion === null) return null;
	const fecha = opiniones.fecha_corte
		? new Date(`${opiniones.fecha_corte}T12:00:00`).toLocaleDateString(
				"es-CO",
				{ day: "numeric", month: "long", year: "numeric" },
			)
		: "";
	return (
		<section
			className="seccion fondo-verde google-sec"
			aria-labelledby="titulo-google"
		>
			<div className="envoltura google">
				<div className="google-espacio" aria-hidden="true">
					Espacio para el logo de Google
				</div>
				<div className="google-texto">
					<h2 id="titulo-google">
						{opiniones.calificacion.toString().replace(".", ",")} de 5 en Google
					</h2>
					<p className="google-nota">
						<span className="estrellas" aria-hidden="true">
							{Array.from({ length: 5 }, (_, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: cinco estrellas fijas
								<Icono key={i} nombre="estrella" />
							))}
						</span>
						<span>
							{opiniones.numero_opiniones} opiniones
							{fecha ? `, al ${fecha}` : ""}
						</span>
					</p>
				</div>
				{opiniones.url_ficha && (
					<a
						className="boton"
						href={opiniones.url_ficha}
						target="_blank"
						rel="noopener noreferrer"
					>
						Ver la ficha
					</a>
				)}
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
								<strong>Ubicación en Google Maps</strong>
								<span>Toca «Cómo llegar» para abrirla</span>
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
