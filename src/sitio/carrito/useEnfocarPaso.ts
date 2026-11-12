import { useEffect, useRef } from "react";
import { desplazarA } from "../../compartido/movimiento/desplazar";

/**
 * Al cambiar de paso del carrito, sube al inicio y lleva el foco al título del
 * paso (`#titulo-paso`). Sin esto, en móvil el paso nuevo aparece a media
 * página y el lector de pantalla no anuncia el cambio.
 */
export function useEnfocarPaso(paso: number) {
	const anterior = useRef(paso);
	useEffect(() => {
		if (anterior.current === paso) return;
		anterior.current = paso;
		desplazarA(0);
		document.getElementById("titulo-paso")?.focus({ preventScroll: true });
	}, [paso]);
}
