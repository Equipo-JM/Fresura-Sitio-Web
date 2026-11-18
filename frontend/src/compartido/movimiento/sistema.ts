import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText, Draggable);

/**
 * Sistema único de movimiento del sitio: duraciones (s), curvas, escalonados y
 * distancias. Todas las animaciones lo usan para sentirse de la misma marca.
 */
export const MOVIMIENTO = {
	duracion: { prensa: 0.18, revelar: 0.85, entrada: 1.1, pagina: 0.55 },
	curva: {
		entrada: "expo.out",
		mover: "power3.inOut",
		aterrizar: "back.out(1.7)",
		caer: "bounce.out",
	},
	escalonado: { texto: 0.055, tarjetas: 0.1 },
	distancia: 34,
} as const;

/**
 * Indica si la persona pidió reducir el movimiento. Con esa preferencia no se
 * construye ninguna animación y todo queda visible desde el principio.
 */
export function prefiereMenosMovimiento(): boolean {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
