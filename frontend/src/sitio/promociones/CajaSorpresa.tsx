import { type ReactNode, useRef, useState } from "react";
import { useCajaSorpresa } from "./useCajaSorpresa";

/** Colores de las fresas que salen de la caja al abrirla. */
const CONFETI = [
	"flamingo",
	"porcini",
	"we-peep",
	"flamingo",
	"porcini",
	"we-peep",
	"flamingo",
	"porcini",
	"flamingo",
	"we-peep",
	"flamingo",
	"porcini",
] as const;

/**
 * Caja de regalo del estado vacío de /promociones. Se abre y se cierra al
 * tocarla. `children` va entre la caja y el texto de estado, que cuenta lo que
 * pasa y se anuncia con `aria-live`.
 */
export function CajaSorpresa({ children }: { children?: ReactNode }) {
	const [abierta, setAbierta] = useState(false);
	const caja = useRef<HTMLButtonElement>(null);
	useCajaSorpresa(caja, abierta);
	return (
		<>
			<button
				type="button"
				className="caja-sorpresa"
				ref={caja}
				aria-pressed={abierta}
				aria-label={
					abierta ? "Cerrar la caja sorpresa" : "Abrir la caja sorpresa"
				}
				onClick={() => setAbierta((a) => !a)}
			>
				<span className="caja-base" />
				<span className="caja-tapa" />
				<img className="caja-lazo" src="/marca/fresa-we-peep.svg" alt="" />
				<span className="caja-confeti" aria-hidden="true">
					{CONFETI.map((color, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: lista fija decorativa
						<img key={i} src={`/marca/fresa-${color}.svg`} alt="" />
					))}
				</span>
			</button>
			{children}
			<p className="caja-estado" aria-live="polite">
				{abierta
					? "Todavía no hay nada guardado, pero lo bueno se está cocinando. Vuelve pronto."
					: "Toca la caja: aún está cerrada."}
			</p>
		</>
	);
}
