import { type RefObject, useRef } from "react";
import { Link } from "react-router";
import { FotoPendiente } from "../../compartido/componentes/FotoPendiente";
import { Icono } from "../../compartido/componentes/Icono";
import { useCintaDesplazamiento } from "../../compartido/movimiento/useCintaDesplazamiento";
import { useEntradaPortada } from "../../compartido/movimiento/useEntradaPortada";

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
	sedes: number;
}) {
	const raiz = useRef<HTMLElement>(null);
	useEntradaPortada(raiz);

	return (
		<>
			<section className="portada" aria-labelledby="titulo-portada" ref={raiz}>
				<div className="envoltura portada-grid">
					<div className="portada-texto">
						<h1 id="titulo-portada" aria-label={titulo}>
							{titulo.split(" ").map((palabra, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: las palabras del título son una lista fija que no se reordena
								<span className="portada-palabra-caja" key={`${palabra}-${i}`}>
									<span className="portada-palabra">{palabra}</span>{" "}
								</span>
							))}
						</h1>
						<p className="portada-bajada portada-entrada">{texto}</p>
						<div className="portada-acciones portada-entrada">
							<Link className="boton" to="/#menu">
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
									{sedes === 2 ? "Dos sedes" : `${sedes} sedes`} en Bogotá
								</strong>
							</span>
						</p>
					</div>
					<div className="portada-foto">
						<div className="arco portada-arco">
							<FotoPendiente texto="Foto de portada por validar" />
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
