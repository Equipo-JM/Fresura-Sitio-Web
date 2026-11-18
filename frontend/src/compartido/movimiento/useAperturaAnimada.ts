import { gsap } from "gsap";
import { useEffect } from "react";
import { MOVIMIENTO, prefiereMenosMovimiento } from "./sistema";

/**
 * Cuando `abierto` pasa a verdadero, los elementos de `selector` entran
 * escalonados. El cierre es inmediato: salir rápido se siente más ágil.
 */
export function useAperturaAnimada(abierto: boolean, selector: string) {
	useEffect(() => {
		if (!abierto || prefiereMenosMovimiento()) return;
		const elementos = gsap.utils.toArray<HTMLElement>(selector);
		if (!elementos.length) return;
		const animacion = gsap.fromTo(
			elementos,
			{ y: -10, opacity: 0 },
			{
				y: 0,
				opacity: 1,
				duration: 0.45,
				stagger: 0.04,
				ease: MOVIMIENTO.curva.entrada,
				clearProps: "transform,opacity",
			},
		);
		return () => {
			animacion.progress(1).kill();
		};
	}, [abierto, selector]);
}

/**
 * Preguntas desplegables (`details`) que se abren con su respuesta creciendo y
 * apareciendo, en vez de saltar. Escucha el evento `toggle` en todo el documento.
 */
export function useDesplegablesSuaves() {
	useEffect(() => {
		if (prefiereMenosMovimiento()) return;
		const alAbrir = (evento: Event) => {
			const detalles = evento.target;
			if (!(detalles instanceof HTMLDetailsElement) || !detalles.open) return;
			const respuesta = detalles.querySelector(":scope > :not(summary)");
			if (!respuesta) return;
			gsap.fromTo(
				respuesta,
				{ height: 0, opacity: 0, overflow: "hidden" },
				{
					height: "auto",
					opacity: 1,
					duration: 0.5,
					ease: MOVIMIENTO.curva.entrada,
					clearProps: "height,opacity,overflow",
				},
			);
		};
		// `toggle` no burbujea: se escucha en la fase de captura.
		document.addEventListener("toggle", alAbrir, true);
		return () => document.removeEventListener("toggle", alAbrir, true);
	}, []);
}
