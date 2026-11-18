import { gsap } from "gsap";
import { type RefObject, useEffect, useRef } from "react";
import { MOVIMIENTO, prefiereMenosMovimiento } from "./sistema";

/**
 * Cada vez que cambia `clave` (no en el primer render), la foto de `contenedor`
 * aparece desenfocada y se aclara, y los textos suben escalonados. Sirve para
 * tarjetas que cambian de contenido sin cambiar de lugar.
 */
export function useCambioAnimado(
	contenedor: RefObject<HTMLElement | null>,
	clave: string,
) {
	const primera = useRef(true);
	// biome-ignore lint/correctness/useExhaustiveDependencies: clave no se lee, pero cada cambio debe reproducir la animación
	useEffect(() => {
		const elemento = contenedor.current;
		if (primera.current) {
			primera.current = false;
			return;
		}
		if (!elemento || prefiereMenosMovimiento()) return;
		const contexto = gsap.context(() => {
			gsap.fromTo(
				"[data-cambio='foto']",
				{ opacity: 0, scale: 1.12, filter: "blur(8px)" },
				{
					opacity: 1,
					scale: 1,
					filter: "blur(0px)",
					duration: 0.8,
					ease: MOVIMIENTO.curva.entrada,
					clearProps: "filter,transform,opacity",
				},
			);
			gsap.from("[data-cambio='texto'] > *", {
				y: 16,
				opacity: 0,
				duration: 0.6,
				stagger: 0.07,
				ease: MOVIMIENTO.curva.entrada,
				clearProps: "transform,opacity",
			});
		}, elemento);
		return () => contexto.revert();
	}, [contenedor, clave]);
}
