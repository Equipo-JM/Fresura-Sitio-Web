import { useRef } from "react";
import { Link } from "react-router";
import { FotoEjemplo } from "../../compartido/componentes/FotoEjemplo";
import { Icono } from "../../compartido/componentes/Icono";
import { CLAVE_PORTADA } from "../../compartido/fotos/almacenFotosDemo";
import { useFotosDemo } from "../../compartido/fotos/useFotosDemo";
import { useCalcomaniaViva } from "../../compartido/movimiento/useCalcomaniaViva";
import { useEntradaPortada } from "../../compartido/movimiento/useEntradaPortada";
import { FOTO_PORTADA } from "./copy";

/**
 * Portada del inicio: el título del contrato, dos acciones y la foto en arco.
 * Las palabras entran una vez al cargar.
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
	const sello = useRef<HTMLImageElement>(null);
	useCalcomaniaViva(sello, { girar: false, alCargar: true });
	const fotoCambiada = useFotosDemo()[CLAVE_PORTADA];

	// Las versiones de contenido anteriores conservan el lema que sustituyó el equipo.
	const titular =
		/^Ven, date un gusto bonito(?:(?:…|\.\.\.) como tú)?[.!]?$/i.test(
			titulo.trim(),
		)
			? "Fresas jugosas, crema esponjosa y tu toque favorito"
			: titulo;
	const enfasis = "tu toque favorito";
	return (
		<section
			className="portada-borde"
			aria-labelledby="titulo-portada"
			ref={raiz}
		>
			<div className="portada">
				<img
					className="deco portada-trazo"
					src="/marca/trazo-1-we-peep.svg"
					alt=""
				/>
				<div className="envoltura portada-grid">
					<div className="portada-texto">
						<h1 id="titulo-portada">
							{titular.endsWith(enfasis) ? (
								<>
									{titular.slice(0, -enfasis.length)}
									<em>{enfasis}</em>
								</>
							) : (
								titular
							)}
						</h1>
						<p className="portada-bajada portada-entrada">{texto}</p>
						<div className="portada-acciones portada-entrada">
							<Link className="boton" to="/menu">
								Ver el menú
							</Link>
							<Link className="boton secundario" to="/menu#antojos">
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
							ref={sello}
							className="portada-sello calcomania-viva"
							draggable={false}
							src="/marca/sticker-sello.svg"
							alt=""
							width="148"
							height="148"
						/>
					</div>
				</div>
			</div>
		</section>
	);
}
