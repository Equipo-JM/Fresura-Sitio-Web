import { gsap } from "gsap";
import Lenis from "lenis";
import { useEffect } from "react";

/**
 * Desplazamiento suave con Lenis, sincronizado con el reloj de GSAP. Con
 * «reducir movimiento» no se activa y la página se desplaza como siempre.
 */
export function useDesplazamientoSuave() {
	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		const lenis = new Lenis({ duration: 1.05, smoothWheel: true });
		const avanzar = (tiempo: number) => lenis.raf(tiempo * 1000);
		// Sin esto, GSAP compensa las pausas y Lenis salta al volver a la pestaña.
		gsap.ticker.lagSmoothing(0);
		gsap.ticker.add(avanzar);

		return () => {
			gsap.ticker.remove(avanzar);
			gsap.ticker.lagSmoothing(500, 33);
			lenis.destroy();
		};
	}, []);
}
