import { type CSSProperties, useState } from "react";

/**
 * Fresas que salen de la caja: color y hacia dónde vuelan (x, y en px y giro).
 * Solo Flamingo y Porcini: las We Peep se perdían sobre el fondo We Peep.
 */
const FRESAS = [
	// La tapa abierta sube en diagonal hacia la derecha, así que las fresas van
	// en dos grupos que no la tocan: tres por encima de su lado izquierdo y
	// cuatro a la derecha de su punta. Ninguna pasa de -126 px: más arriba
	// tocaban la franja de la cabecera.
	{ color: "flamingo", x: -130, y: -100, giro: -18 },
	{ color: "porcini", x: -95, y: -126, giro: 10 },
	{ color: "flamingo", x: -62, y: -126, giro: -8 },
	{ color: "porcini", x: 90, y: -120, giro: 16 },
	{ color: "flamingo", x: 125, y: -90, giro: -12 },
	{ color: "porcini", x: 95, y: -65, giro: 20 },
	{ color: "flamingo", x: 130, y: -35, giro: -16 },
] as const;

/**
 * La caja sorpresa del estado vacío, esta vez abierta porque hay promociones:
 * cae, la tapa salta y las fresas salen y se quedan flotando. Al tocarla se
 * repite la animación. Todo el movimiento está en CSS y se apaga con
 * `prefers-reduced-motion`.
 */
export function CajaAbierta() {
	// Cambiar la clave vuelve a montar la caja y reinicia sus animaciones.
	const [ronda, setRonda] = useState(0);
	return (
		<button
			type="button"
			className="caja-abierta"
			aria-label="Repetir la animación de la caja"
			onClick={() => setRonda((r) => r + 1)}
		>
			<span key={ronda} className="caja-abierta-escena">
				<span className="caja-abierta-base" />
				<span className="caja-abierta-tapa" />
				{FRESAS.map((fresa, i) => (
					<img
						// biome-ignore lint/suspicious/noArrayIndexKey: lista fija decorativa
						key={i}
						className="caja-abierta-fresa"
						src={`/marca/fresa-${fresa.color}.svg`}
						alt=""
						style={
							{
								"--x": `${fresa.x}px`,
								"--y": `${fresa.y}px`,
								"--giro": `${fresa.giro}deg`,
								"--retraso": `${i * 60}ms`,
							} as CSSProperties
						}
					/>
				))}
			</span>
		</button>
	);
}
