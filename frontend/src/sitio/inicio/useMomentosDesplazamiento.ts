import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type RefObject, useEffect } from "react";

/**
 * Reproduce los movimientos ligados al scroll (el sello de la portada en el
 * inicio y la foto de Nosotros en /nosotros) y los revierte al cambiar de página.
 */
export function useMomentosDesplazamiento(
	raiz: RefObject<HTMLElement | null>,
	ruta: string,
	cargado: boolean,
) {
	useEffect(() => {
		if (
			!cargado ||
			(ruta !== "/" && ruta !== "/nosotros") ||
			!raiz.current ||
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
		)
			return;
		gsap.registerPlugin(ScrollTrigger);
		const contexto = gsap.context(() => {
			if (document.querySelector(".portada"))
				gsap.to(".portada-sello", {
					rotation: 120,
					ease: "none",
					scrollTrigger: {
						trigger: ".portada",
						start: "top top",
						end: "bottom top",
						scrub: 0.6,
					},
				});
			if (document.querySelector("#nosotros"))
				gsap.fromTo(
					".nosotros-foto .arco img",
					{ scale: 1.14 },
					{
						scale: 1,
						ease: "none",
						scrollTrigger: {
							trigger: "#nosotros",
							start: "top bottom",
							end: "center center",
							scrub: 0.6,
						},
					},
				);
		}, raiz);
		return () => contexto.revert();
	}, [raiz, ruta, cargado]);
}
