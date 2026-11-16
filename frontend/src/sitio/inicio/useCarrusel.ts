import { useCallback, useEffect, useRef, useState } from "react";

/** Cuenta páginas según las tarjetas visibles y sincroniza flechas, teclado y deslizamiento. */
export function useCarrusel(cantidad: number) {
	const carril = useRef<HTMLUListElement>(null);
	const [estado, setEstado] = useState({ posicion: 1, paginas: cantidad });
	const medir = useCallback(() => {
		const el = carril.current;
		if (!el?.clientWidth) return null;
		const tarjetas = el.children;
		const paso =
			tarjetas.length > 1
				? (tarjetas[1] as HTMLElement).offsetLeft -
					(tarjetas[0] as HTMLElement).offsetLeft
				: el.clientWidth;
		if (paso <= 0) return null;
		const porVista = Math.max(1, Math.round(el.clientWidth / paso));
		const paginas = Math.ceil(cantidad / porVista);
		const posicion =
			el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
				? paginas
				: Math.min(paginas, Math.round(el.scrollLeft / (paso * porVista)) + 1);
		return { el, paso, porVista, paginas, posicion };
	}, [cantidad]);
	const actualizar = useCallback(() => {
		const medida = medir();
		if (medida)
			setEstado((anterior) =>
				anterior.posicion === medida.posicion &&
				anterior.paginas === medida.paginas
					? anterior
					: { posicion: medida.posicion, paginas: medida.paginas },
			);
	}, [medir]);
	useEffect(() => {
		const el = carril.current;
		if (!el) return;
		const observador = new ResizeObserver(actualizar);
		observador.observe(el);
		actualizar();
		return () => observador.disconnect();
	}, [actualizar]);
	function desplazar(sentido: number) {
		const medida = medir();
		if (!medida) return;
		const siguiente = medida.posicion + sentido;
		if (siguiente < 1 || siguiente > medida.paginas) return;
		medida.el.scrollTo({
			left: (siguiente - 1) * medida.paso * medida.porVista,
			behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
				? "auto"
				: "smooth",
		});
	}
	return { carril, ...estado, actualizar, desplazar };
}
