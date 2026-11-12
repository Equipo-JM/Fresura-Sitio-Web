import { gsap } from "gsap";
import { type RefObject, useEffect } from "react";

/**
 * Entrada de la portada: las palabras del título suben una a una y la foto se
 * abre desde abajo. Se ejecuta una sola vez al cargar, nunca en bucle.
 */
export function useEntradaPortada(portada: RefObject<HTMLElement | null>) {
	useEffect(() => {
		const raiz = portada.current;
		if (!raiz) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		const contexto = gsap.context(() => {
			gsap
				.timeline({ defaults: { ease: "expo.out" } })
				.from(".portada-palabra", {
					yPercent: 105,
					opacity: 0,
					filter: "blur(6px)",
					duration: 1,
					stagger: 0.055,
				})
				.from(
					".portada-entrada",
					{ y: 14, opacity: 0, duration: 0.8, stagger: 0.07 },
					0.35,
				)
				.from(
					".portada-arco",
					{
						clipPath: "inset(100% 0% 0% 0% round 999px 999px 18px 18px)",
						duration: 1.2,
						ease: "expo.inOut",
					},
					0.05,
				)
				.from(
					".portada-sello",
					{
						scale: 0.8,
						rotate: -40,
						opacity: 0,
						duration: 0.9,
						ease: "back.out(1.7)",
					},
					0.75,
				);
		}, raiz);

		return () => contexto.revert();
	}, [portada]);
}
