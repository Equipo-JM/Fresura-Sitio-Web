import { type RefObject, useLayoutEffect, useRef } from "react";
import { prefiereMenosMovimiento } from "./sistema";

/** Suaviza el cambio de ruta sin retrasar la interacción ni la primera carga. */
export function useEntradaDePagina(
	principal: RefObject<HTMLElement | null>,
	ruta: string,
) {
	const anterior = useRef(ruta);
	useLayoutEffect(() => {
		if (anterior.current === ruta) return;
		anterior.current = ruta;
		if (prefiereMenosMovimiento()) return;
		const entrada = principal.current?.animate(
			[{ opacity: 0.96 }, { opacity: 1 }],
			{ duration: 100, easing: "ease-out" },
		);
		return () => entrada?.cancel();
	}, [principal, ruta]);
}
