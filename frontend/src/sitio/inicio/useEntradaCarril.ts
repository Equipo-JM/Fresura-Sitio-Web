import { gsap } from "gsap";
import { type RefObject, useEffect } from "react";
import {
	MOVIMIENTO,
	prefiereMenosMovimiento,
} from "../../compartido/movimiento/sistema";

/**
 * Las tarjetas de `carril` entran escalonadas, subiendo y con un leve giro,
 * la primera vez que el carril aparece en pantalla: el mismo gesto con el que
 * entra el abanico en escritorio. Con movimiento reducido no se anima nada.
 */
export function useEntradaCarril(carril: RefObject<HTMLElement | null>) {
	useEffect(() => {
		const raiz = carril.current;
		if (!raiz || prefiereMenosMovimiento()) return;
		const contexto = gsap.context(() => {
			gsap.from(":scope > li", {
				y: 60,
				rotation: 4,
				opacity: 0,
				duration: MOVIMIENTO.duracion.entrada,
				stagger: 0.08,
				ease: MOVIMIENTO.curva.entrada,
				clearProps: "transform,opacity",
				scrollTrigger: { trigger: raiz, start: "top 85%", once: true },
			});
		}, raiz);
		return () => contexto.revert();
	}, [carril]);
}
