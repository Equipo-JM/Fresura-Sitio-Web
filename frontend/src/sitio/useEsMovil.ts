import { useSyncExternalStore } from "react";

/** Mismo corte que usan los estilos para pasar de la vitrina de escritorio a los carriles. */
const CONSULTA_MOVIL = "(max-width: 899.98px)";

function suscribir(avisar: () => void) {
	const lista = window.matchMedia(CONSULTA_MOVIL);
	lista.addEventListener("change", avisar);
	return () => lista.removeEventListener("change", avisar);
}

/**
 * `true` en pantallas angostas (celular y tableta vertical). Se actualiza al
 * girar el teléfono o cambiar el tamaño de la ventana.
 */
export function useEsMovil(): boolean {
	return useSyncExternalStore(
		suscribir,
		() => window.matchMedia(CONSULTA_MOVIL).matches,
		() => false,
	);
}
