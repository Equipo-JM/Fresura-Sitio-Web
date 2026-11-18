import { gsap } from "gsap";
import { type RefObject, useEffect } from "react";

/** Entrada breve y simultánea del texto y la foto de portada. */
export function useEntradaPortada(portada: RefObject<HTMLElement | null>) {
	useEffect(() => {
		const raiz = portada.current;
		if (!raiz) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		const contexto = gsap.context(() => {
			gsap.from(".portada-texto, .portada-arco", {
				y: 4,
				opacity: 0.94,
				duration: 0.16,
				ease: "power2.out",
			});
		}, raiz);

		return () => contexto.revert();
	}, [portada]);
}
