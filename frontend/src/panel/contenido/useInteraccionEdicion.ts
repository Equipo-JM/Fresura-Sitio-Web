import { type RefObject, useEffect } from "react";

/** Avisa al cerrar la pestaña para no perder lo que aún no se guardó. */
export function useAvisoSalida(pendiente: boolean) {
	useEffect(() => {
		if (!pendiente) return;
		const avisar = (evento: BeforeUnloadEvent) => evento.preventDefault();
		window.addEventListener("beforeunload", avisar);
		return () => window.removeEventListener("beforeunload", avisar);
	}, [pendiente]);
}

/** Lleva el foco al campo rechazado después de abrir su apartado. */
export function useFocoError(
	formulario: RefObject<HTMLFormElement | null>,
	destino: { ruta: string } | null,
) {
	useEffect(() => {
		if (!destino) return;
		const control = formulario.current?.querySelector<HTMLElement>(
			`[data-campo="${destino.ruta}"]`,
		);
		if (control) control.focus();
		else document.getElementById(`error-${destino.ruta}`)?.focus();
	}, [formulario, destino]);
}
