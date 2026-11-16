import type { Producto, Seleccion } from "../../compartido/carrito/reglas";

/** Color de la base o de la salsa según el sabor elegido (propuesta, por validar). */
const COLOR_SABOR: Record<string, string> = {
	"leche-condensada": "#E6D2B8",
	chocolate: "#5B3B24",
	arequipe: "#CFA67B",
	maracuya: "#CFA67B",
	lulo: "#CFCB9A",
	cereza: "#EC72A8",
	nutella: "#5B3B24",
	nucita: "#5B3B24",
};

/** Puntos de los espolvoreados dentro de la crema (coordenadas del dibujo). */
const PUNTOS: [number, number, string][] = [
	[64, 66, "#5B3B24"],
	[88, 62, "#CFA67B"],
	[118, 66, "#5B3B24"],
	[146, 62, "#CFA67B"],
	[172, 68, "#5B3B24"],
	[76, 100, "#CFA67B"],
	[130, 104, "#5B3B24"],
	[160, 102, "#CFA67B"],
	[100, 84, "#5B3B24"],
	[182, 82, "#CFA67B"],
];

/** Trazos de salsa, uno por cada salsa elegida (hasta dos). */
const HILOS = [
	"M52 74 C70 66 84 86 102 76 S134 66 150 78 S178 88 190 74",
	"M54 92 C74 84 92 102 112 92 S146 84 164 96 S182 100 188 90",
];

/**
 * Vaso por capas que se llena con lo que la persona elige. Las capas no se
 * cruzan: la base abajo, las fresas en el medio, la crema con la salsa en hilo
 * y los espolvoreados encima. La base y la salsa toman el color del sabor.
 */
export function VasoIlustrado({
	producto,
	seleccion,
}: {
	producto: Producto;
	seleccion: Seleccion;
}) {
	const base = seleccion.base?.[0];
	const salsas = seleccion.salsas ?? [];
	const espolvoreados = seleccion.espolvoreados ?? [];
	const colorBase = (base && COLOR_SABOR[base]) ?? "#CFA67B";
	const armado = producto.grupos_opciones.length > 0;

	return (
		<div className="zona-vaso">
			<svg
				className="vaso"
				viewBox="0 0 240 280"
				aria-hidden="true"
				focusable="false"
			>
				<defs>
					<clipPath id="vaso-interior">
						<path d="M37 42 H203 L184 260 Q182 269 172 269 H68 Q58 269 56 260 Z" />
					</clipPath>
				</defs>
				<g clipPath="url(#vaso-interior)">
					<rect x="0" y="40" width="240" height="240" fill="#EFE8D7" />
					<g
						className="capa-base"
						style={{ transform: `scaleY(${base ? 1 : 0})` }}
					>
						<path
							d="M40 212 C80 202 100 222 120 212 S165 202 200 212 V275 H40 Z"
							fill={colorBase}
						/>
					</g>
					{armado && (
						<>
							<image
								href="/marca/fresa-flamingo.svg"
								x="58"
								y="128"
								width="46"
								height="65"
							/>
							<image
								href="/marca/fresa-flamingo.svg"
								x="97"
								y="118"
								width="46"
								height="65"
							/>
							<image
								href="/marca/fresa-flamingo.svg"
								x="136"
								y="128"
								width="46"
								height="65"
							/>
						</>
					)}
					<g className="capa-salsa">
						{salsas.slice(0, 2).map((idSalsa, i) => (
							<path
								key={idSalsa}
								d={HILOS[i]}
								fill="none"
								stroke={COLOR_SABOR[idSalsa] ?? "#5B3B24"}
								strokeWidth="6"
								strokeLinecap="round"
							/>
						))}
					</g>
					<g className="capa-esp">
						{espolvoreados.length > 0 &&
							PUNTOS.map(([cx, cy, color]) => (
								<circle
									key={`${cx}-${cy}`}
									cx={cx}
									cy={cy}
									r="3.2"
									fill={color}
								/>
							))}
					</g>
				</g>
				<path
					d="M34 40 H206 L186 262 Q184 272 172 272 H68 Q56 272 54 262 Z"
					fill="none"
					stroke="#5B3B24"
					strokeWidth="3"
					strokeLinejoin="round"
				/>
				<path
					d="M26 40 H214"
					stroke="#5B3B24"
					strokeWidth="6"
					strokeLinecap="round"
				/>
			</svg>
		</div>
	);
}
