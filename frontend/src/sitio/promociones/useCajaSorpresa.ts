import { gsap } from "gsap";
import { type RefObject, useEffect, useRef } from "react";
import {
	MOVIMIENTO,
	prefiereMenosMovimiento,
} from "../../compartido/movimiento/sistema";

/**
 * Movimiento de la caja sorpresa: cae al entrar, tiembla cada pocos segundos
 * mientras está cerrada y, al abrirse, la tapa salta, el lazo vuela y salen
 * fresas en todas direcciones. Al cerrarla vuelve a su sitio.
 */
export function useCajaSorpresa(
	caja: RefObject<HTMLButtonElement | null>,
	abierta: boolean,
) {
	const montada = useRef(false);

	useEffect(() => {
		const elemento = caja.current;
		if (!elemento || prefiereMenosMovimiento()) return;
		const contexto = gsap.context(() => {
			gsap.from(elemento, {
				y: -240,
				rotation: -12,
				opacity: 0,
				duration: 1,
				delay: 0.3,
				ease: MOVIMIENTO.curva.caer,
			});
		}, elemento);
		return () => contexto.revert();
	}, [caja]);

	useEffect(() => {
		const elemento = caja.current;
		if (!elemento) return;
		const primera = !montada.current;
		montada.current = true;
		const tapa = elemento.querySelector(".caja-tapa");
		const lazo = elemento.querySelector(".caja-lazo");
		const fresas = gsap.utils.toArray<HTMLElement>(
			elemento.querySelectorAll(".caja-confeti img"),
		);
		if (prefiereMenosMovimiento()) {
			gsap.set(
				tapa,
				abierta ? { rotation: -118, y: -26 } : { clearProps: "transform" },
			);
			gsap.set(
				lazo,
				abierta ? { opacity: 0 } : { clearProps: "opacity,transform" },
			);
			return;
		}
		const contexto = gsap.context(() => {
			if (!abierta) {
				if (!primera) {
					gsap.to(tapa, {
						rotation: 0,
						y: 0,
						duration: 0.4,
						ease: "power3.out",
					});
					gsap.to(lazo, { y: 0, rotation: 0, opacity: 1, duration: 0.4 });
				}
				gsap
					.timeline({ repeat: -1, repeatDelay: 3, delay: 2.4 })
					.to(elemento, {
						rotation: 6,
						duration: 0.08,
						repeat: 7,
						yoyo: true,
						ease: "sine.inOut",
					})
					.to(elemento, { rotation: 0, duration: 0.1 });
				return;
			}
			gsap.set(elemento, { rotation: 0 });
			const linea = gsap
				.timeline()
				.to(tapa, {
					rotation: -118,
					y: -26,
					duration: 0.55,
					ease: "back.out(2.4)",
				})
				.to(
					lazo,
					{
						y: -110,
						rotation: 30,
						opacity: 0,
						duration: 0.7,
						ease: "power3.out",
					},
					0,
				)
				.to(
					elemento,
					{
						scale: 1.08,
						duration: 0.18,
						yoyo: true,
						repeat: 1,
						ease: "power2.out",
					},
					0,
				);
			fresas.forEach((fresa, i) => {
				const angulo = (i / fresas.length) * Math.PI * 2;
				const distancia = gsap.utils.random(110, 210);
				linea
					.fromTo(
						fresa,
						{ x: 0, y: 0, scale: 0.3, opacity: 1, rotation: 0 },
						{
							x: Math.cos(angulo) * distancia,
							y: Math.sin(angulo) * distancia - 60,
							scale: gsap.utils.random(0.9, 1.5),
							rotation: gsap.utils.random(-200, 200),
							duration: 1.1,
							ease: "power3.out",
						},
						0.1,
					)
					.to(
						fresa,
						{ opacity: 0, y: "+=90", duration: 0.7, ease: "power1.in" },
						1,
					);
			});
		});
		return () => contexto.kill();
	}, [caja, abierta]);
}
