import { type RefObject, useEffect } from "react";

/** Cierra el menú con Escape o al tocar fuera del desplegable y devuelve el foco. */
export function useCierreNavegacion(
	abierto: boolean,
	movil: boolean,
	botonMenu: RefObject<HTMLButtonElement | null>,
	botonNavegacion: RefObject<HTMLButtonElement | null>,
	cerrar: () => void,
) {
	useEffect(() => {
		if (!abierto) return;
		function alTocar(evento: MouseEvent) {
			if (
				!movil &&
				evento.target instanceof Element &&
				!evento.target.closest(".menu-item")
			)
				cerrar();
		}
		function alPulsar(evento: KeyboardEvent) {
			if (evento.key !== "Escape") return;
			cerrar();
			(movil ? botonNavegacion : botonMenu).current?.focus();
		}
		document.addEventListener("click", alTocar);
		document.addEventListener("keydown", alPulsar);
		return () => {
			document.removeEventListener("click", alTocar);
			document.removeEventListener("keydown", alPulsar);
		};
	}, [abierto, movil, botonMenu, botonNavegacion, cerrar]);
}
