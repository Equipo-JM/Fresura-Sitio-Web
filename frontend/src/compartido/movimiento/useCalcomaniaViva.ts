import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { type RefObject, useEffect } from "react";
import { MOVIMIENTO, prefiereMenosMovimiento } from "./sistema";

/**
 * La calcomanía cae con peso cuando entra en pantalla, se asienta con un rebote
 * y desde ese momento se puede arrastrar. El arrastre se crea al aterrizar: si se
 * creara antes, Draggable guardaría la posición en el aire y la repondría al salir.
 * Con `girar: false` cae sin girar, para piezas cuyo giro ya anima otro efecto
 * (el sello de la portada gira con el desplazamiento). Con `alCargar` cae al
 * montar, sin esperar al desplazamiento: sirve para piezas que ya se ven al
 * abrir la página y cuyo elemento ya tiene otro disparador de desplazamiento.
 */
export function useCalcomaniaViva(
	calcomania: RefObject<HTMLElement | null>,
	{
		girar = true,
		alCargar = false,
	}: { girar?: boolean; alCargar?: boolean } = {},
) {
	useEffect(() => {
		const elemento = calcomania.current;
		if (!elemento || prefiereMenosMovimiento()) return;
		let arrastre: Draggable | null = null;
		const contexto = gsap.context(() => {
			gsap
				.timeline({
					...(alCargar
						? { delay: 0.6 }
						: {
								scrollTrigger: {
									trigger: elemento,
									start: "top 95%",
									once: true,
								},
							}),
					onComplete: () => {
						arrastre = Draggable.create(elemento, {
							type: "x,y",
							edgeResistance: 0.8,
							zIndexBoost: false,
							onPress: () => {
								gsap.to(elemento, {
									scale: 1.08,
									duration: 0.25,
									ease: MOVIMIENTO.curva.aterrizar,
									overwrite: "auto",
								});
							},
							onRelease: () => {
								gsap.to(elemento, {
									scale: 1,
									duration: 0.5,
									ease: "elastic.out(1, 0.5)",
									overwrite: "auto",
								});
							},
						})[0];
					},
				})
				.from(elemento, {
					y: -280,
					rotation: girar ? gsap.utils.random(-30, 30) : 0,
					scale: 1.5,
					opacity: 0,
					duration: 0.9,
					ease: "power3.in",
				})
				.fromTo(
					elemento,
					{ scaleY: 0.82, transformOrigin: "50% 100%" },
					{ scaleY: 1, duration: 0.7, ease: "elastic.out(1, 0.35)" },
				);
		});
		return () => {
			arrastre?.kill();
			contexto.revert();
			gsap.set(elemento, { clearProps: "transform,opacity" });
		};
	}, [calcomania, girar, alCargar]);
}
