import { gsap } from "gsap";
import { type RefObject, useEffect, useRef } from "react";
import type { Seleccion } from "../../compartido/carrito/reglas";
import {
	MOVIMIENTO,
	prefiereMenosMovimiento,
} from "../../compartido/movimiento/sistema";

/** Largo de un trazo SVG; jsdom no lo implementa y entonces no se anima. */
function largo(trazo: SVGGeometryElement): number | null {
	return typeof trazo.getTotalLength === "function"
		? trazo.getTotalLength()
		: null;
}

/** Dibuja un trazo de principio a fin. */
function dibujar(trazo: SVGGeometryElement, duracion: number, retraso = 0) {
	const total = largo(trazo);
	if (!total) return;
	gsap.fromTo(
		trazo,
		{ strokeDasharray: total, strokeDashoffset: total },
		{
			strokeDashoffset: 0,
			duration: duracion,
			delay: retraso,
			ease: "power2.inOut",
			clearProps: "strokeDasharray,strokeDashoffset",
		},
	);
}

/**
 * Anima el vaso ilustrado sin cambiar su dibujo: al entrar se traza el vaso y
 * las fresas saltan adentro; después cada salsa nueva se dibuja como un hilo y
 * los espolvoreados caen con rebote. La base ya crece con su transición CSS.
 */
export function useVasoAnimado(
	vaso: RefObject<SVGSVGElement | null>,
	seleccion: Seleccion,
) {
	const salsasPrevias = useRef((seleccion.salsas ?? []).length);
	const espolvoreadosPrevios = useRef((seleccion.espolvoreados ?? []).length);

	useEffect(() => {
		const svg = vaso.current;
		if (!svg || prefiereMenosMovimiento()) return;
		const contexto = gsap.context(() => {
			for (const trazo of svg.querySelectorAll<SVGGeometryElement>(
				".vaso-contorno",
			))
				dibujar(trazo, 1.3);
			gsap.from(svg.querySelectorAll(".vaso-fresa"), {
				scale: 0,
				opacity: 0,
				transformOrigin: "50% 50%",
				duration: 0.7,
				stagger: 0.12,
				delay: 0.8,
				ease: MOVIMIENTO.curva.aterrizar,
			});
		}, svg);
		return () => contexto.revert();
	}, [vaso]);

	const salsas = (seleccion.salsas ?? []).length;
	const espolvoreados = (seleccion.espolvoreados ?? []).length;
	useEffect(() => {
		const svg = vaso.current;
		const habiaSalsas = salsasPrevias.current;
		const habiaEspolvoreados = espolvoreadosPrevios.current;
		salsasPrevias.current = salsas;
		espolvoreadosPrevios.current = espolvoreados;
		if (!svg || prefiereMenosMovimiento()) return;
		if (salsas > habiaSalsas) {
			const hilos =
				svg.querySelectorAll<SVGGeometryElement>(".capa-salsa path");
			const nuevo = hilos[hilos.length - 1];
			if (nuevo) dibujar(nuevo, 0.8);
		}
		if (habiaEspolvoreados === 0 && espolvoreados > 0)
			gsap.from(svg.querySelectorAll(".capa-esp circle"), {
				y: -120,
				opacity: 0,
				duration: 0.9,
				stagger: { each: 0.03, from: "random" },
				ease: MOVIMIENTO.curva.caer,
			});
	}, [vaso, salsas, espolvoreados]);
}
