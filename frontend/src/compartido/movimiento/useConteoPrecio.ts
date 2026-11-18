import { gsap } from "gsap";
import { type RefObject, useEffect } from "react";
import { prefiereMenosMovimiento } from "./sistema";

/**
 * El número sube de cero hasta `valor` al entrar en la ficha. Escribe sobre un
 * nodo decorativo (`aria-hidden`); el precio final se lee siempre en texto aparte.
 */
export function useConteoPrecio(
	nodo: RefObject<HTMLElement | null>,
	valor: number | null,
	formato: (n: number) => string,
) {
	useEffect(() => {
		const elemento = nodo.current;
		if (!elemento || valor === null || prefiereMenosMovimiento()) return;
		const cuenta = { n: 0 };
		const animacion = gsap.to(cuenta, {
			n: valor,
			duration: 1.4,
			delay: 0.35,
			ease: "power3.out",
			onUpdate: () => {
				elemento.textContent = formato(Math.round(cuenta.n / 100) * 100);
			},
			onComplete: () => {
				elemento.textContent = formato(valor);
			},
		});
		return () => {
			animacion.kill();
			elemento.textContent = formato(valor);
		};
	}, [nodo, valor, formato]);
}
