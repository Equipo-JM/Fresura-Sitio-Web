import { type RefObject, useEffect, useRef } from "react";
import { prefiereMenosMovimiento } from "../../compartido/movimiento/sistema";

/**
 * Llama a `avanzar` cada `cada` milisegundos mientras `zona` está a la vista. Se
 * detiene si la persona lo pausó, si tiene el puntero o el foco dentro de la
 * zona, si la pestaña está oculta o si pidió reducir el movimiento.
 */
export function useAutoavance(
	zona: RefObject<HTMLElement | null>,
	avanzar: () => void,
	pausado: boolean,
	cada = 4500,
) {
	const ultimoAvanzar = useRef(avanzar);
	useEffect(() => {
		ultimoAvanzar.current = avanzar;
	}, [avanzar]);

	useEffect(() => {
		const el = zona.current;
		// Sin IntersectionObserver no se sabe si la zona está a la vista: mejor
		// quieta que avanzando fuera de pantalla.
		if (
			!el ||
			pausado ||
			prefiereMenosMovimiento() ||
			typeof IntersectionObserver === "undefined"
		)
			return;
		let visible = false;
		let ocupado = false;
		const observador = new IntersectionObserver(
			([entrada]) => {
				visible = entrada.isIntersecting;
			},
			{ threshold: 0.4 },
		);
		observador.observe(el);
		const ocupar = () => {
			ocupado = true;
		};
		const soltar = () => {
			ocupado = el.matches(":hover") || el.contains(document.activeElement);
		};
		el.addEventListener("pointerenter", ocupar);
		el.addEventListener("pointerleave", soltar);
		el.addEventListener("focusin", ocupar);
		el.addEventListener("focusout", soltar);
		const reloj = window.setInterval(() => {
			if (visible && !ocupado && document.visibilityState === "visible")
				ultimoAvanzar.current();
		}, cada);
		return () => {
			window.clearInterval(reloj);
			observador.disconnect();
			el.removeEventListener("pointerenter", ocupar);
			el.removeEventListener("pointerleave", soltar);
			el.removeEventListener("focusin", ocupar);
			el.removeEventListener("focusout", soltar);
		};
	}, [zona, pausado, cada]);
}
