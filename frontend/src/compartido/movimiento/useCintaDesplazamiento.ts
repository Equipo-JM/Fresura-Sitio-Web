import { gsap } from "gsap";
import { type RefObject, useEffect } from "react";

/**
 * La cinta avanza según la velocidad con que la persona desplaza la página y
 * se detiene cuando la página se detiene. No tiene movimiento propio, así que
 * no hay nada que animar sin desplazamiento.
 */
export function useCintaDesplazamiento(pista: RefObject<HTMLElement | null>) {
	useEffect(() => {
		const elemento = pista.current;
		if (!elemento) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		const mitad = elemento.scrollWidth / 2;
		const envolver = gsap.utils.wrap(-mitad, 0);
		const mover = gsap.quickSetter(elemento, "x", "px");
		let x = 0;
		let velocidad = 0;
		let ultimoY = window.scrollY;

		const latir = () => {
			const y = window.scrollY;
			const delta = Math.max(-60, Math.min(60, y - ultimoY));
			ultimoY = y;
			velocidad += (delta - velocidad) * 0.12;
			if (Math.abs(velocidad) < 0.01) return;
			x = envolver(x - velocidad * 0.9);
			mover(x);
		};

		gsap.ticker.add(latir);
		return () => gsap.ticker.remove(latir);
	}, [pista]);
}
