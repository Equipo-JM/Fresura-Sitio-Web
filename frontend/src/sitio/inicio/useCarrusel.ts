import { gsap } from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	MOVIMIENTO,
	prefiereMenosMovimiento,
} from "../../compartido/movimiento/sistema";

/**
 * Cuenta páginas según las tarjetas visibles y sincroniza flechas, teclado y
 * deslizamiento. Con las flechas el carril se desliza animado y las tarjetas que
 * entran crecen un poco, en vez de saltar.
 */
export function useCarrusel(cantidad: number) {
	const carril = useRef<HTMLUListElement>(null);
	const [estado, setEstado] = useState({ posicion: 1, paginas: cantidad });
	// Mientras el carril se desliza animado, la posición ya se anunció: medir a
	// mitad de camino haría saltar el contador.
	const animando = useRef(false);
	const posicionActual = useRef(1);
	posicionActual.current = estado.posicion;
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
		if (animando.current) return;
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
		const siguiente = posicionActual.current + sentido;
		if (siguiente < 1 || siguiente > medida.paginas) return;
		const { el, paso, porVista } = medida;
		const destino = (siguiente - 1) * paso * porVista;
		if (prefiereMenosMovimiento()) {
			el.scrollTo({ left: destino, behavior: "auto" });
			return;
		}
		posicionActual.current = siguiente;
		setEstado({ posicion: siguiente, paginas: medida.paginas });
		animando.current = true;
		// El imán de desplazamiento pelea con un avance animado: se apaga durante
		// el recorrido y se devuelve al terminar.
		el.style.scrollSnapType = "none";
		gsap.to(el, {
			scrollLeft: destino,
			duration: 0.75,
			ease: MOVIMIENTO.curva.mover,
			overwrite: true,
			onComplete: () => {
				el.style.scrollSnapType = "";
				animando.current = false;
				actualizar();
			},
		});
		const inicio = (siguiente - 1) * porVista;
		gsap.fromTo(
			Array.from(el.children).slice(inicio, inicio + porVista),
			{ opacity: 0.4, scale: 0.94 },
			{
				opacity: 1,
				scale: 1,
				duration: 0.6,
				delay: 0.15,
				stagger: 0.06,
				ease: MOVIMIENTO.curva.entrada,
				clearProps: "opacity,transform",
			},
		);
	}
	return { carril, ...estado, actualizar, desplazar };
}
