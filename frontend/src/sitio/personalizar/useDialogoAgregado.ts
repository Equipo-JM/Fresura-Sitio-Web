import { useEffect, useRef } from "react";

/** Abre el diálogo nativo con foco atrapado y restituye el foco al cerrarlo. */
export function useDialogoAgregado(abierto: boolean) {
	const dialogo = useRef<HTMLDialogElement>(null);
	useEffect(() => {
		const elemento = dialogo.current;
		if (!abierto || !elemento) return;
		elemento.showModal();
		return () => {
			if (elemento.open) elemento.close();
		};
	}, [abierto]);
	return dialogo;
}
