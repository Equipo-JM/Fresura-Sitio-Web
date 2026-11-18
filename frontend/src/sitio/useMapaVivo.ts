import { gsap } from "gsap";
import { type RefObject, useEffect } from "react";
import {
	MOVIMIENTO,
	prefiereMenosMovimiento,
} from "../compartido/movimiento/sistema";

/**
 * Al entrar el mapa en pantalla, la fresa cae sobre la sede con rebote y la zona
 * de domicilios se expande desde el centro; luego la zona respira despacio.
 */
export function useMapaVivo(
	mapa: RefObject<HTMLElement | null>,
	activo: boolean,
) {
	useEffect(() => {
		const elemento = mapa.current;
		if (!elemento || !activo || prefiereMenosMovimiento()) return;
		const contexto = gsap.context(() => {
			const disparo = { trigger: elemento, start: "top 85%", once: true };
			gsap.from(".mapa-fresa", {
				y: -200,
				opacity: 0,
				duration: 1.1,
				ease: MOVIMIENTO.curva.caer,
				scrollTrigger: disparo,
			});
			if (elemento.querySelector(".mapa-radio")) {
				gsap.from(".mapa-radio", {
					scale: 0.1,
					opacity: 0,
					duration: 1.6,
					delay: 0.5,
					ease: MOVIMIENTO.curva.entrada,
					scrollTrigger: disparo,
				});
				gsap.to(".mapa-radio", {
					scale: 1.04,
					duration: 2.4,
					delay: 2.2,
					ease: "sine.inOut",
					yoyo: true,
					repeat: -1,
				});
			}
		}, elemento);
		return () => contexto.revert();
	}, [mapa, activo]);
}
