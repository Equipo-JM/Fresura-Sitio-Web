import { Fragment, type RefObject, useRef } from "react";
import { Link } from "react-router";
import { FotoEjemplo } from "../../compartido/componentes/FotoEjemplo";
import { Icono } from "../../compartido/componentes/Icono";
import { CLAVE_PORTADA } from "../../compartido/fotos/almacenFotosDemo";
import { useFotosDemo } from "../../compartido/fotos/useFotosDemo";
import { useCintaDesplazamiento } from "../../compartido/movimiento/useCintaDesplazamiento";
import { useEntradaPortada } from "../../compartido/movimiento/useEntradaPortada";
import { FOTO_PORTADA } from "./copy";

/**
 * Portada del inicio: el título del contrato, dos acciones y la foto en arco.
 * Las palabras entran una vez al cargar; la cinta se mueve con el desplazamiento.
 */
export function Portada({
	titulo,
	texto,
	sedes,
}: {
	titulo: string;
	texto: string;
	sedes: string[];
}) {
	const raiz = useRef<HTMLElement>(null);
	useEntradaPortada(raiz);
	const fotoCambiada = useFotosDemo()[CLAVE_PORTADA];

	return (
		<>
			<section className="portada" aria-labelledby="titulo-portada" ref={raiz}>
				<img
					className="deco portada-trazo"
					src="/marca/trazo-1-we-peep.svg"
					alt=""
				/>
				<div className="envoltura portada-grid">
					<div className="portada-texto">
						<h1 id="titulo-portada" aria-label={titulo}>
							{titulo.split(" ").map((palabra, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: las palabras del título son una lista fija que no se reordena
								<Fragment key={`${palabra}-${i}`}>
									{/* El espacio va fuera de la caja: dentro de un inline-block se pierde y las palabras se pegan. */}
									{titulo.endsWith("como tú") &&
									i === titulo.split(" ").length - 2 ? (
										<em>
											<span className="portada-palabra-caja">
												<span className="portada-palabra">como</span>
											</span>{" "}
											<span className="portada-palabra-caja">
												<span className="portada-palabra">tú</span>
											</span>
										</em>
									) : titulo.endsWith("como tú") &&
										i === titulo.split(" ").length - 1 ? null : (
										<span className="portada-palabra-caja">
											<span className="portada-palabra">{palabra}</span>
										</span>
									)}{" "}
								</Fragment>
							))}
						</h1>
						<p className="portada-bajada portada-entrada">{texto}</p>
						<div className="portada-acciones portada-entrada">
							<Link className="boton" to="/menu">
								Ver el menú
							</Link>
							<Link className="boton secundario" to="/#antojos">
								¿No sabes qué pedir?
							</Link>
						</div>
						<p className="portada-dato portada-entrada">
							<Icono nombre="ubicacion" />
							<span>
								<strong>
									{sedes.length === 2 ? "Dos sedes" : `${sedes.length} sedes`}{" "}
									en Bogotá:
								</strong>{" "}
								{sedes.map((s) => s.replace(/^Sede /, " ").trim()).join(" y ")}
							</span>
						</p>
					</div>
					<div className="portada-foto">
						{!fotoCambiada && <span className="pv pv-foto">Por validar</span>}
						<div className="arco portada-arco">
							{fotoCambiada ? (
								<img
									src={fotoCambiada.url}
									alt={fotoCambiada.alt}
									width={FOTO_PORTADA.ancho}
									height={FOTO_PORTADA.alto}
								/>
							) : (
								<FotoEjemplo
									{...FOTO_PORTADA}
									tamanos="(min-width: 900px) 40vw, 90vw"
									prioridad
									marcada={false}
								/>
							)}
						</div>
						<img
							className="portada-sello"
							src="/marca/sticker-sello.svg"
							alt=""
							width="148"
							height="148"
						/>
					</div>
				</div>
			</section>
			<Cinta />
		</>
	);
}

/** Banda con la frase de marca. Se mueve con el desplazamiento; es decorativa. */
function Cinta() {
	const pista = useRef<HTMLDivElement>(null);
	useCintaDesplazamiento(pista as RefObject<HTMLElement>);
	const trozo = (
		<>
			<span>Dulce, pero con estilo</span>
			<img src="/marca/fresa-we-peep.svg" alt="" width="16" height="23" />
		</>
	);
	return (
		<div className="cinta" aria-hidden="true">
			<div className="cinta-pista" ref={pista}>
				{Array.from({ length: 16 }, (_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: el trozo se repite igual, sin orden propio
					<span className="cinta-trozo" key={i}>
						{trozo}
					</span>
				))}
			</div>
		</div>
	);
}
