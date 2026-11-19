import { type RefObject, useCallback, useEffect, useState } from "react";
import { prefiereMenosMovimiento } from "../compartido/movimiento/sistema";

/**
 * Índice de la tarjeta que va al frente en un carril horizontal y una función
 * para llevar el carril hasta otra. El índice se recalcula al deslizar con el dedo.
 */
export function useAvanceCarril(carril: RefObject<HTMLElement | null>): {
	actual: number;
	irA: (indice: number) => void;
} {
	const [actual, setActual] = useState(0);

	useEffect(() => {
		const raiz = carril.current;
		if (!raiz) return;
		let cuadro = 0;
		const medir = () => {
			cuadro = 0;
			const tarjetas = Array.from(raiz.children) as HTMLElement[];
			if (tarjetas.length === 0) return;
			// Al llegar al final, la última puede no alinearse a la izquierda: se
			// marca igual para que el indicador no se quede en la penúltima.
			if (raiz.scrollLeft + raiz.clientWidth >= raiz.scrollWidth - 4) {
				setActual(tarjetas.length - 1);
				return;
			}
			const inicio = tarjetas[0].offsetLeft;
			let cercana = 0;
			let menor = Number.POSITIVE_INFINITY;
			for (const [indice, tarjeta] of tarjetas.entries()) {
				const distancia = Math.abs(
					tarjeta.offsetLeft - inicio - raiz.scrollLeft,
				);
				if (distancia < menor) {
					menor = distancia;
					cercana = indice;
				}
			}
			setActual(cercana);
		};
		const alDesplazar = () => {
			if (!cuadro) cuadro = requestAnimationFrame(medir);
		};
		raiz.addEventListener("scroll", alDesplazar, { passive: true });
		return () => {
			raiz.removeEventListener("scroll", alDesplazar);
			cancelAnimationFrame(cuadro);
		};
	}, [carril]);

	const irA = useCallback(
		(indice: number) => {
			const raiz = carril.current;
			const tarjetas = raiz ? (Array.from(raiz.children) as HTMLElement[]) : [];
			const destino = tarjetas[indice];
			if (!raiz || !destino) return;
			raiz.scrollTo({
				left: destino.offsetLeft - tarjetas[0].offsetLeft,
				behavior: prefiereMenosMovimiento() ? "auto" : "smooth",
			});
		},
		[carril],
	);

	return { actual, irA };
}
