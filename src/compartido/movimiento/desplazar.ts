import type Lenis from "lenis";

// Lenis guarda su propia posición: si se mueve la página por fuera de él, al
// siguiente giro de la rueda vuelve a donde estaba. Por eso todo desplazamiento
// programado pasa por aquí y usa Lenis cuando está activo.
let lenisActivo: Lenis | null = null;

/** Registra (o quita, con `null`) la instancia de Lenis que controla la página. */
export function registrarLenis(lenis: Lenis | null) {
	lenisActivo = lenis;
}

/** Altura del encabezado fijo, para que no tape el inicio de la sección. */
function alturaEncabezado(): number {
	return (
		document.querySelector(".sitio-h")?.getBoundingClientRect().height ?? 0
	);
}

/**
 * Lleva la página a un elemento (dejando libre el encabezado) o a una posición.
 * Con «reducir movimiento», o si `suave` es falso, el salto es inmediato.
 */
export function desplazarA(destino: HTMLElement | number, suave = false) {
	const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const inmediato = !suave || reducir;
	const y =
		typeof destino === "number"
			? destino
			: destino.getBoundingClientRect().top +
				window.scrollY -
				alturaEncabezado();
	if (lenisActivo) {
		// Tras cambiar de ruta Lenis aún conserva la altura de la página anterior
		// y recortaría el destino a ese límite.
		lenisActivo.resize();
		lenisActivo.scrollTo(y, { immediate: inmediato, force: true });
		return;
	}
	window.scrollTo({ top: y, behavior: inmediato ? "auto" : "smooth" });
}
