import { gsap } from "gsap";
import { type RefObject, useEffect, useLayoutEffect } from "react";
import {
	MOVIMIENTO,
	prefiereMenosMovimiento,
} from "../../compartido/movimiento/sistema";

/** Giro, en grados, entre una tarjeta y la siguiente del abanico. */
const GIRO = 6;

/**
 * Distancia de una tarjeta a la elegida, contando en círculo: con cinco, la
 * última queda a la izquierda de la primera en vez de cuatro puestos a la derecha.
 */
export function distanciaEnCirculo(
	indice: number,
	elegido: number,
	cantidad: number,
): number {
	let distancia = indice - elegido;
	if (distancia > cantidad / 2) distancia -= cantidad;
	if (distancia < -cantidad / 2) distancia += cantidad;
	return distancia;
}

/**
 * Coloca las tarjetas de `escena` en abanico alrededor de la elegida y, cada vez
 * que cambia, las lleva con GSAP desde donde estaban hasta su nuevo lugar. Solo
 * se ven la elegida y una a cada lado; las demás esperan ocultas detrás. Las
 * tarjetas entran escalonadas la primera vez que la escena aparece en pantalla.
 * Con movimiento reducido todo se coloca al instante.
 */
export function useAbanico(
	escena: RefObject<HTMLElement | null>,
	elegido: number,
	cantidad: number,
) {
	useLayoutEffect(() => {
		const raiz = escena.current;
		if (!raiz) return;
		const cartas = Array.from(
			raiz.querySelectorAll<HTMLElement>(":scope > .abanico-carta"),
		);
		const colocar = (animar: boolean) => {
			const anchoCarta = cartas[0]?.offsetWidth ?? 300;
			// En pantallas angostas las vecinas asoman por los bordes; en las
			// anchas se abren hasta 210 px, lo que cabe junto al texto.
			const paso = Math.min(210, anchoCarta * 0.62);
			const duracion =
				animar && !prefiereMenosMovimiento() ? MOVIMIENTO.duracion.revelar : 0;
			for (const [indice, carta] of cartas.entries()) {
				const distancia = distanciaEnCirculo(indice, elegido, cantidad);
				const lejos = Math.abs(distancia);
				// La que va a quedar a la vista se hace visible ya, no al primer cuadro de
				// la animación: así se puede enfocar y leer desde el primer momento.
				gsap.set(
					carta,
					lejos > 1
						? { zIndex: 10 - lejos }
						: { zIndex: 10 - lejos, visibility: "inherit" },
				);
				gsap.to(carta, {
					x: distancia * paso,
					y: lejos * 26,
					rotation: distancia * GIRO,
					scale: 1 - Math.min(lejos, 2) * 0.14,
					autoAlpha: lejos > 1 ? 0 : 1 - lejos * 0.3,
					duration: duracion,
					ease: MOVIMIENTO.curva.entrada,
					overwrite: "auto",
				});
			}
		};
		colocar(raiz.dataset.colocado === "si");
		raiz.dataset.colocado = "si";
		// El observador avisa también al empezar a observar: sin comparar el ancho,
		// ese primer aviso cortaría la animación del cambio recién lanzada.
		let anchoAnterior = raiz.clientWidth;
		const observador = new ResizeObserver(() => {
			if (raiz.clientWidth === anchoAnterior) return;
			anchoAnterior = raiz.clientWidth;
			colocar(false);
		});
		observador.observe(raiz);
		return () => observador.disconnect();
	}, [escena, elegido, cantidad]);

	useEffect(() => {
		const raiz = escena.current;
		if (!raiz || prefiereMenosMovimiento()) return;
		const contexto = gsap.context(() => {
			gsap.from(".abanico-entrada", {
				y: 60,
				rotation: 4,
				opacity: 0,
				duration: MOVIMIENTO.duracion.entrada,
				stagger: 0.08,
				ease: MOVIMIENTO.curva.entrada,
				scrollTrigger: { trigger: raiz, start: "top 85%", once: true },
			});
		}, raiz);
		return () => contexto.revert();
	}, [escena]);
}
