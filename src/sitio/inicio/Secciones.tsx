import type { Contenido } from "../../../supabase/functions/_shared/esquemas/contenido";
import { FotoEjemplo } from "../../compartido/componentes/FotoEjemplo";
import { Icono } from "../../compartido/componentes/Icono";
import { MarcaPorValidar } from "../MarcaPorValidar";
import { FOTOS_RECIENTE, TEXTO_RECIENTE } from "./copy";

/** «Lo más reciente»: fotos tipo polaroid con enlace a Instagram. Son espacios por validar. */
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
						<p>
							{TEXTO_RECIENTE} <MarcaPorValidar />
						</p>
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
					{FOTOS_RECIENTE.map((foto, i) => (
						<li className={`polaroid p${i + 1}`} key={foto.src}>
							<span
								className={`adhesivo cinta-${foto.cinta}`}
								aria-hidden="true"
							/>
							<div className="polaroid-foto">
								<FotoEjemplo
									src={foto.src}
									alt={foto.alt}
									ancho={600}
									alto={600}
								/>
							</div>
							<p className="polaroid-pie">{usuario}</p>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}

/** Calificación de Google, solo si el contrato la marca como mostrada (RF-12). */
export function Calificacion({
	opiniones,
	estado,
}: {
	opiniones: Contenido["opiniones"];
	estado: Contenido["estado"];
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
					Logo de Google
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
						{estado === "ejemplo" && <MarcaPorValidar />}
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
export function Sedes({ contenido }: { contenido: Contenido }) {
	return (
		<section
			className="seccion con-toldo"
			id="sedes"
			aria-labelledby="titulo-sedes"
		>
			<div className="envoltura">
				<div className="capa-encabezado">
					<h2 id="titulo-sedes" tabIndex={-1}>
						Sedes
					</h2>
					<p className="capa-frase">¿Cuál te queda cerca?</p>
					<p className="capa-dato">Mismos productos y precios en ambas.</p>
				</div>
				<div className="sedes-grid">
					{contenido.negocio.sedes.map((sede) => (
						<article className="sede" key={sede.id}>
							<div className="sede-cuerpo">
								<h3>{sede.nombre}</h3>
								<p className="etiqueta-sede">
									{sede.atiende_pedidos
										? "Recogida y domicilio hasta 5 km en línea recta"
										: "Punto de venta"}
								</p>
								<p>{sede.direccion}, Bogotá</p>
								<table className="horario">
									<caption className="oculto">Horario de {sede.nombre}</caption>
									<tbody>
										{sede.horarios.map((h) => (
											<tr key={h.dias}>
												<th scope="row">{h.dias}</th>
												<td>{h.horas}</td>
											</tr>
										))}
									</tbody>
								</table>
								<a
									className="enlace"
									href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${sede.direccion}, Bogotá, Colombia`)}`}
									target="_blank"
									rel="noopener noreferrer"
								>
									Cómo llegar
									<span className="oculto">
										{" "}
										a {sede.nombre}, se abre en otra pestaña
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

/** Preguntas frecuentes con desplegable, desde el contrato. */
export function Preguntas({ contenido }: { contenido: Contenido }) {
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
					<h2 id="titulo-ayuda" tabIndex={-1}>
						Preguntas frecuentes
					</h2>
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
