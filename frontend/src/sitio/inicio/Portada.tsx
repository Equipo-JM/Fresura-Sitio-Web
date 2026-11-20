import { type CSSProperties, useId, useRef } from "react";
import { Link } from "react-router";
import { Icono } from "../../compartido/componentes/Icono";
import { useEntradaPortada } from "../../compartido/movimiento/useEntradaPortada";
import { FRASE_PORTADA } from "./copy";
import {
	MEDIDAS_PIEZAS,
	PIEZAS_COSTADOS,
	PIEZAS_PORTADA,
	type PiezaCostado,
	type PiezaPortada,
} from "./piezasPortada";

/**
 * Estelas largas que entran desde los bordes de la pantalla hacia el vaso:
 * extienden el viento de la escena a todo el ancho en escritorio.
 */
const VIENTO_ANCHO = [
	{
		d: "M-20 420 C 120 330, 260 300, 470 330",
		ritmo: 5.4,
		ancho: "viento-ancho",
	},
	{
		d: "M-20 690 C 160 640, 330 600, 500 590",
		ritmo: 4.2,
		ancho: "viento-medio",
	},
	{
		d: "M1460 300 C 1320 330, 1180 360, 980 350",
		ritmo: 5,
		ancho: "viento-ancho",
	},
	{
		d: "M1460 620 C 1300 610, 1150 590, 960 600",
		ritmo: 4.4,
		ancho: "viento-medio",
	},
];

/** Viento a todo el ancho, detrás del contenido. Cada estela se desvanece en sus puntas. */
function VientoAncho({ aire, hilo }: { aire: string; hilo: string }) {
	return (
		<svg
			className="deco portada-viento-ancho"
			viewBox="0 0 1440 800"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<defs>
				<linearGradient id={aire}>
					<stop offset="0" stopColor="#fadad7" stopOpacity="0" />
					<stop offset="0.3" stopColor="#fadad7" />
					<stop offset="0.7" stopColor="#fadad7" />
					<stop offset="1" stopColor="#fadad7" stopOpacity="0" />
				</linearGradient>
				<linearGradient id={hilo}>
					<stop offset="0" stopColor="#ec72a8" stopOpacity="0" />
					<stop offset="0.35" stopColor="#ec72a8" stopOpacity="0.5" />
					<stop offset="0.65" stopColor="#ec72a8" stopOpacity="0.5" />
					<stop offset="1" stopColor="#ec72a8" stopOpacity="0" />
				</linearGradient>
			</defs>
			{VIENTO_ANCHO.map((estela) => {
				const ritmo = { "--ritmo": `${estela.ritmo}s` } as CSSProperties;
				return (
					<g key={estela.d}>
						<path
							d={estela.d}
							className={estela.ancho}
							stroke={`url(#${aire})`}
							opacity={0.45}
						/>
						<path
							d={estela.d}
							className={`${estela.ancho} viento-estela`}
							pathLength={1}
							stroke={`url(#${aire})`}
							style={ritmo}
						/>
						<path
							d={estela.d}
							className="viento-hilo viento-estela"
							pathLength={1}
							stroke={`url(#${hilo})`}
							style={ritmo}
						/>
					</g>
				);
			})}
		</svg>
	);
}

/**
 * Pieza grande de un costado. Tres capas: la exterior la ubica y hace la
 * entrada, la del medio recibe la profundidad (puntero y desplazamiento) y la
 * interior se mece con el viento.
 */
function PiezaDeCostado({ pieza }: { pieza: PiezaCostado }) {
	const estilo = {
		"--borde": `${pieza.borde}%`,
		"--y": `${pieza.y}%`,
		"--ancho": `${pieza.ancho}vw`,
		"--tope": `${pieza.tope}px`,
		"--desenfoque": `${pieza.desenfoque}px`,
	} as CSSProperties;
	const transformacion = [
		pieza.espejo ? "scaleX(-1)" : "",
		pieza.giro ? `rotate(${pieza.giro}deg)` : "",
	]
		.join(" ")
		.trim();
	const medidas = MEDIDAS_PIEZAS[pieza.imagen];
	return (
		<div
			className="portada-costado"
			style={estilo}
			data-lado={pieza.lado}
			data-profundidad={pieza.profundidad}
			data-sentido={pieza.sentido}
			data-vaiven={pieza.vaiven}
			data-ritmo={pieza.ritmo}
		>
			<div className="portada-costado-profundidad">
				<div className="portada-pieza-vuelo">
					<img
						src={`/portada/${pieza.imagen}.webp`}
						alt=""
						width={medidas.ancho}
						height={medidas.alto}
						loading="lazy"
						decoding="async"
						draggable={false}
						style={transformacion ? { transform: transformacion } : undefined}
					/>
				</div>
			</div>
		</div>
	);
}

/** Estelas que pasan detrás del vaso, por arriba. */
const VIENTO_ATRAS = [
	{
		d: "M70 310 C 120 150, 380 70, 560 92 C 760 115, 900 180, 950 260",
		ritmo: 5,
		conHilo: true,
		ancho: "viento-ancho",
	},
	{
		d: "M150 270 C 260 150, 520 118, 820 168",
		ritmo: 3.8,
		conHilo: false,
		ancho: "viento-medio",
	},
];

/** Estelas que cruzan por delante de la base del vaso y envuelven la escena. */
const VIENTO_DELANTE = [
	{
		d: "M950 250 C 920 360, 720 440, 500 432 C 300 425, 120 380, 60 290",
		ritmo: 5,
		conHilo: true,
		ancho: "viento-ancho",
	},
	{
		d: "M880 330 C 760 420, 420 448, 150 360",
		ritmo: 3.6,
		conHilo: false,
		ancho: "viento-medio",
	},
];

/** Remolinos cortos junto a las fresas: dejan ver que el aire las empuja. */
const RAFAGAS = [
	{ d: "M250 72 C 290 42, 345 40, 380 62", ritmo: 2.6 },
	{ d: "M740 296 C 790 274, 845 282, 880 312", ritmo: 2.8 },
	{ d: "M300 352 C 260 350, 215 336, 182 306", ritmo: 3 },
];

type Estela = (typeof VIENTO_ATRAS)[number];

/**
 * Una capa de viento. Cada estela tiene un rastro quieto y tenue, una ráfaga
 * que lo recorre y, en las principales, un hilo flamingo en el centro.
 */
function Viento({
	capa,
	estelas,
	rafagas = [],
	aire,
	hilo,
}: {
	capa: "atras" | "delante";
	estelas: Estela[];
	rafagas?: typeof RAFAGAS;
	aire: string;
	hilo: string;
}) {
	return (
		<svg
			className={`portada-viento ${capa}`}
			viewBox="0 0 1000 470"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			{estelas.map((estela) => {
				const ritmo = { "--ritmo": `${estela.ritmo}s` } as CSSProperties;
				return (
					<g key={estela.d}>
						<path
							d={estela.d}
							className={estela.ancho}
							stroke={`url(#${aire})`}
							opacity={0.5}
						/>
						<path
							d={estela.d}
							className={`${estela.ancho} viento-estela`}
							pathLength={1}
							stroke={`url(#${aire})`}
							style={ritmo}
						/>
						{estela.conHilo && (
							<path
								d={estela.d}
								className="viento-hilo viento-estela"
								pathLength={1}
								stroke={`url(#${hilo})`}
								style={ritmo}
							/>
						)}
					</g>
				);
			})}
			{rafagas.map((rafaga) => (
				<path
					key={rafaga.d}
					d={rafaga.d}
					className="viento-hilo viento-estela"
					pathLength={1}
					stroke={`url(#${hilo})`}
					style={{ "--ritmo": `${rafaga.ritmo}s` } as CSSProperties}
				/>
			))}
		</svg>
	);
}

/** Una pieza suelta. El hook de entrada lee sus `data-*` para animarla. */
function Pieza({ pieza }: { pieza: PiezaPortada }) {
	const { escritorio, movil } = pieza;
	const posicion = {
		"--x": `${escritorio.x}%`,
		"--y": `${escritorio.y}%`,
		"--ancho": `${escritorio.ancho}%`,
		"--x-movil": `${movil?.x ?? 0}%`,
		"--y-movil": `${movil?.y ?? 0}%`,
		"--ancho-movil": `${movil?.ancho ?? 0}%`,
	} as CSSProperties;
	const transformacion = [
		pieza.espejo ? "scaleX(-1)" : "",
		pieza.giro ? `rotate(${pieza.giro}deg)` : "",
	]
		.join(" ")
		.trim();
	const medidas = MEDIDAS_PIEZAS[pieza.imagen];
	return (
		<div
			className={`portada-pieza ${pieza.capa}`}
			style={posicion}
			data-movil={movil ? undefined : "no"}
			data-sentido={pieza.sentido}
			data-vaiven={pieza.vaiven}
			data-ritmo={pieza.ritmo}
		>
			<div className="portada-pieza-vuelo">
				<img
					src={`/portada/${pieza.imagen}.webp`}
					alt=""
					width={medidas.ancho}
					height={medidas.alto}
					decoding="async"
					draggable={false}
					style={transformacion ? { transform: transformacion } : undefined}
				/>
			</div>
		</div>
	);
}

/**
 * Lemas que el contenido traía antes del rediseño de la portada. Si el panel
 * aún tiene uno de ellos, se muestra la frase nueva; cualquier otro título
 * editado se respeta tal cual.
 */
const LEMAS_ANTERIORES = [
	/^Ven, date un gusto bonito(?:(?:…|\.\.\.) como tú)?[.!]?$/i,
	/^Fresas jugosas, crema esponjosa y tu toque favorito[.!]?$/i,
];

/**
 * Portada del inicio: el logotipo grande, el título del contenido como frase
 * de marca y una escena con el vaso al centro y fresas, barquillos, pepitas y
 * crocantes llevados por el viento. Debajo, las dos acciones principales y el
 * dato de sedes.
 */
export function Portada({
	titulo,
	sedes,
}: {
	titulo: string;
	sedes: string[];
}) {
	const raiz = useRef<HTMLElement>(null);
	useEntradaPortada(raiz);
	const frase = LEMAS_ANTERIORES.some((lema) => lema.test(titulo.trim()))
		? FRASE_PORTADA
		: titulo;
	const id = useId();
	const aire = `${id}-aire`;
	const hilo = `${id}-hilo`;

	return (
		<section
			className="portada-borde"
			aria-labelledby="titulo-portada"
			ref={raiz}
		>
			<div className="portada">
				<svg
					className="deco portada-ondas"
					viewBox="0 0 1440 420"
					preserveAspectRatio="none"
					aria-hidden="true"
				>
					<path
						d="M0 40 C 120 0, 260 20, 380 110 C 470 180, 520 300, 560 420 L0 420 Z"
						fill="var(--color-we-peep)"
					/>
					<path
						d="M1440 30 C 1320 0, 1180 30, 1070 120 C 990 190, 930 300, 890 420 L1440 420 Z"
						fill="var(--color-we-peep)"
					/>
				</svg>
				{/* Los degradados del viento se comparten entre las dos capas. */}
				<svg
					width="0"
					height="0"
					aria-hidden="true"
					style={{ position: "absolute" }}
				>
					<defs>
						<linearGradient
							id={aire}
							gradientUnits="userSpaceOnUse"
							x1="40"
							y1="0"
							x2="960"
							y2="0"
						>
							<stop offset="0" stopColor="#fadad7" stopOpacity="0" />
							<stop offset="0.18" stopColor="#fadad7" />
							<stop offset="0.82" stopColor="#fadad7" />
							<stop offset="1" stopColor="#fadad7" stopOpacity="0" />
						</linearGradient>
						<linearGradient
							id={hilo}
							gradientUnits="userSpaceOnUse"
							x1="40"
							y1="0"
							x2="960"
							y2="0"
						>
							<stop offset="0" stopColor="#ec72a8" stopOpacity="0" />
							<stop offset="0.25" stopColor="#ec72a8" stopOpacity="0.55" />
							<stop offset="0.75" stopColor="#ec72a8" stopOpacity="0.55" />
							<stop offset="1" stopColor="#ec72a8" stopOpacity="0" />
						</linearGradient>
					</defs>
				</svg>
				<VientoAncho aire={`${aire}-ancho`} hilo={`${hilo}-ancho`} />

				<div className="envoltura portada-contenido">
					<div className="portada-logo">
						<img
							src="/marca/logo-horizontal-color.svg"
							alt="Fresura"
							width="758"
							height="136"
						/>
					</div>
					<h1 id="titulo-portada" className="portada-frase">
						{frase}
					</h1>

					<div className="portada-escena">
						<Viento
							capa="atras"
							estelas={VIENTO_ATRAS}
							aire={aire}
							hilo={hilo}
						/>
						{PIEZAS_PORTADA.filter((p) => p.capa === "atras").map((pieza) => (
							<Pieza
								key={`${pieza.imagen}-${pieza.escritorio.x}`}
								pieza={pieza}
							/>
						))}
						<div className="portada-vaso">
							<div className="portada-vaso-flota">
								<img
									src="/portada/vaso.webp"
									alt="Vaso de fresas con crema con salsa de chocolate, granola, chocolates de colores, una fresa y un barquillo"
									width={MEDIDAS_PIEZAS.vaso.ancho}
									height={MEDIDAS_PIEZAS.vaso.alto}
									fetchPriority="high"
								/>
							</div>
						</div>
						<div className="portada-sombra" aria-hidden="true" />
						<Viento
							capa="delante"
							estelas={VIENTO_DELANTE}
							rafagas={RAFAGAS}
							aire={aire}
							hilo={hilo}
						/>
						{PIEZAS_PORTADA.filter((p) => p.capa === "delante").map((pieza) => (
							<Pieza
								key={`${pieza.imagen}-${pieza.escritorio.x}`}
								pieza={pieza}
							/>
						))}
					</div>

					<div className="portada-acciones portada-entrada">
						<Link className="boton" to="/menu">
							Ver el menú
						</Link>
						<Link className="boton secundario" to="/nosotros">
							Conocer Fresura
						</Link>
					</div>
					<p className="portada-dato portada-entrada">
						<Icono nombre="ubicacion" />
						<span>
							<strong>
								{sedes.length === 2 ? "Dos sedes" : `${sedes.length} sedes`} en
								Bogotá:
							</strong>{" "}
							{sedes.map((s) => s.replace(/^Sede /, " ").trim()).join(" y ")}
						</span>
					</p>
				</div>

				<div className="portada-costados" aria-hidden="true">
					{PIEZAS_COSTADOS.map((pieza) => (
						<PiezaDeCostado
							key={`${pieza.lado}-${pieza.imagen}-${pieza.y}`}
							pieza={pieza}
						/>
					))}
				</div>
			</div>
		</section>
	);
}
