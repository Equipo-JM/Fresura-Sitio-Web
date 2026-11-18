import { useRef, useState } from "react";
import {
	type Coordenadas,
	centroTrasArrastre,
	proyectar,
	radioEnPixeles,
	urlMapaInsertado,
} from "./mapa";

type Props = {
	nombre: string;
	ubicacion: Coordenadas;
	zoom?: number;
	radioKm?: number | null;
};

/** Reinicia la vista al cambiar de sede o alternar recogida y domicilio. */
export function MapaSede(props: Props) {
	return (
		<VistaMapa
			key={`${props.ubicacion.lat}/${props.ubicacion.lng}/${props.zoom}`}
			{...props}
		/>
	);
}

function VistaMapa({ nombre, ubicacion, zoom = 16, radioKm }: Props) {
	const [centro, cambiarCentro] = useState(ubicacion);
	const [nivel, cambiarNivel] = useState(zoom);
	const [arrastre, mover] = useState({ x: 0, y: 0 });
	const inicio = useRef<{ x: number; y: number; id: number } | null>(null);
	const sede = proyectar(ubicacion, nivel);
	const vista = proyectar(centro, nivel);
	const radio = radioKm ? radioEnPixeles(radioKm, ubicacion.lat, nivel) : 0;
	const url = urlMapaInsertado(centro, nivel, false);
	const [visible, mostrar] = useState({ centro, nivel, url });
	const pendiente = visible.url !== url;
	const anterior = proyectar(visible.centro, nivel);
	const escala = 2 ** (nivel - visible.nivel);
	const capas = pendiente ? [visible.url, url] : [url];
	return (
		<div className="mapa-sede con-fresa">
			<div
				className="mapa-gesto"
				role="application"
				aria-label={`Mapa de la ${nombre}. Usa las flechas para desplazarlo.`}
				// biome-ignore lint/a11y/noNoninteractiveTabindex: el mapa necesita foco para desplazarse con las flechas.
				tabIndex={0}
				onKeyDown={(e) => {
					const pasos: Record<string, [number, number]> = {
						ArrowLeft: [80, 0],
						ArrowRight: [-80, 0],
						ArrowUp: [0, 80],
						ArrowDown: [0, -80],
					};
					const paso = pasos[e.key];
					if (paso) {
						e.preventDefault();
						cambiarCentro(centroTrasArrastre(centro, nivel, ...paso));
					}
				}}
				onPointerDown={(e) => {
					if (!e.isPrimary || e.button !== 0) return;
					e.currentTarget.setPointerCapture(e.pointerId);
					inicio.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
				}}
				onPointerMove={(e) => {
					const p = inicio.current;
					if (p?.id === e.pointerId)
						mover({ x: e.clientX - p.x, y: e.clientY - p.y });
				}}
				onPointerUp={(e) => {
					const p = inicio.current;
					if (p?.id !== e.pointerId) return;
					const dx = e.clientX - p.x,
						dy = e.clientY - p.y;
					if (dx || dy)
						cambiarCentro(centroTrasArrastre(centro, nivel, dx, dy));
				}}
				onLostPointerCapture={() => {
					inicio.current = null;
					mover({ x: 0, y: 0 });
				}}
			>
				<div
					className="mapa-plano"
					style={{ transform: `translate(${arrastre.x}px, ${arrastre.y}px)` }}
				>
					{capas.map((fuente) => {
						const preparando = pendiente && fuente === url;
						return (
							<iframe
								key={fuente}
								src={fuente}
								title={`Mapa de la ${nombre}`}
								tabIndex={-1}
								inert
								referrerPolicy="no-referrer-when-downgrade"
								style={{
									opacity: preparando ? 0 : 1,
									transform:
										pendiente && !preparando
											? `translate(${anterior.x - vista.x}px, ${anterior.y - vista.y}px) scale(${escala})`
											: undefined,
								}}
								onLoad={(evento) => {
									if (preparando)
										evento.currentTarget.classList.add("mapa-vista-lista");
								}}
								onAnimationEnd={() => {
									if (preparando) mostrar({ centro, nivel, url });
								}}
							/>
						);
					})}
					<div
						className="mapa-coordenada"
						style={{
							left: `calc(50% + ${sede.x - vista.x}px)`,
							top: `calc(50% + ${sede.y - vista.y}px)`,
						}}
					>
						{radio > 0 && (
							<span
								className="mapa-radio"
								aria-hidden="true"
								style={{ width: radio * 2, height: radio * 2 }}
							/>
						)}
						<img
							className="mapa-fresa"
							src="/marca/fresa-flamingo.svg"
							alt=""
							width="40"
							height="57"
							draggable={false}
						/>
					</div>
				</div>
			</div>
			<div className="mapa-controles">
				<a
					href={`https://www.google.com/maps/search/?api=1&query=${ubicacion.lat},${ubicacion.lng}`}
					target="_blank"
					rel="noreferrer"
				>
					Abrir en Maps
				</a>
				<button
					type="button"
					aria-label="Alejar mapa"
					disabled={nivel <= 3}
					onClick={() => cambiarNivel(nivel - 1)}
				>
					−
				</button>
				<button
					type="button"
					aria-label="Acercar mapa"
					disabled={nivel >= 19}
					onClick={() => cambiarNivel(nivel + 1)}
				>
					+
				</button>
				<button
					type="button"
					onClick={() => {
						cambiarCentro(ubicacion);
						cambiarNivel(zoom);
					}}
				>
					Ver sede
				</button>
			</div>
		</div>
	);
}
