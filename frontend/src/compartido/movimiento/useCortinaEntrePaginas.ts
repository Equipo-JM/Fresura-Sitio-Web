import { gsap } from "gsap";
import { type RefObject, useLayoutEffect, useRef } from "react";
import { MOVIMIENTO, prefiereMenosMovimiento } from "./sistema";

/**
 * Cortina de toldo entre páginas: al cambiar de ruta cubre la pantalla antes de
 * pintar la página nueva y se retira hacia arriba mientras la fresa salta. No
 * aparece en la primera carga, al cambiar solo el `#` ni con movimiento reducido.
 */
export function useCortinaEntrePaginas(
	cortina: RefObject<HTMLDivElement | null>,
	ruta: string,
) {
	const rutaAnterior = useRef(ruta);
	useLayoutEffect(() => {
		const elemento = cortina.current;
		if (!elemento || rutaAnterior.current === ruta) return;
		rutaAnterior.current = ruta;
		if (prefiereMenosMovimiento()) return;
		const fresa = elemento.querySelector("img");
		const linea = gsap
			.timeline()
			.set(elemento, { yPercent: 0, visibility: "visible" })
			.fromTo(
				fresa,
				{ scale: 0.4, rotation: -30 },
				{
					scale: 1,
					rotation: 0,
					duration: 0.45,
					ease: MOVIMIENTO.curva.aterrizar,
				},
			)
			.to(elemento, {
				yPercent: -100,
				duration: MOVIMIENTO.duracion.pagina + 0.15,
				ease: MOVIMIENTO.curva.mover,
			})
			.set(elemento, { visibility: "hidden", yPercent: 100 });
		return () => {
			linea.progress(1).kill();
		};
	}, [cortina, ruta]);
}
