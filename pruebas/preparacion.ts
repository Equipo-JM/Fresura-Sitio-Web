import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Vitest carga el .env.local real: se reemplaza para que ninguna prueba llegue
// al Supabase del proyecto. El dominio .invalid nunca resuelve.
vi.stubEnv("VITE_SUPABASE_URL", "https://supabase-de-prueba.invalid");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_prueba");

// jsdom no implementa matchMedia; el sitio lo usa para respetar «reducir movimiento».
// Por defecto la preferencia es «sin preferencia».
if (!window.matchMedia) {
	window.matchMedia = (consulta: string) =>
		({
			matches: false,
			media: consulta,
			onchange: null,
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
		}) as MediaQueryList;
}

afterEach(() => {
	cleanup();
});

// Lenis observa el tamaño de la página; jsdom no tiene ResizeObserver.
if (!("ResizeObserver" in globalThis)) {
	globalThis.ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	} as unknown as typeof ResizeObserver;
}

// jsdom no implementa el desplazamiento; el sitio sube al inicio al cambiar de ruta.
window.scrollTo = () => {};
