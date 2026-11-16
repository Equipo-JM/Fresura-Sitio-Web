import { useEffect } from "react";
import { useLocation } from "react-router";
import { desplazarA } from "./desplazar";

/** Tiempo máximo para esperar a que aparezca la sección del enlace (el contenido llega después). */
const ESPERA_MAXIMA_MS = 4000;

/**
 * Sincroniza la posición de la página con la ruta: al cambiar de página se
 * vuelve arriba y, si el enlace trae `#seccion`, se baja hasta ella cuando
 * existe. React Router en modo declarativo no hace ninguna de las dos cosas.
 */
export function useDesplazamientoAlNavegar() {
	const { pathname, hash, key } = useLocation();

	// `key` cambia en cada navegación, así que volver a tocar «Menú» estando ya
	// en /#menu también baja hasta la sección.
	// biome-ignore lint/correctness/useExhaustiveDependencies: key no se lee, pero debe volver a ejecutar el efecto
	useEffect(() => {
		if (!hash) {
			desplazarA(0);
			return;
		}
		const id = decodeURIComponent(hash.slice(1));
		const inicio = performance.now();
		let cuadro = 0;
		// La sección puede no existir aún mientras se carga el contenido.
		const buscar = () => {
			const destino = document.getElementById(id);
			if (destino) {
				desplazarA(destino, true);
				return;
			}
			if (performance.now() - inicio < ESPERA_MAXIMA_MS) {
				cuadro = requestAnimationFrame(buscar);
			}
		};
		buscar();
		return () => cancelAnimationFrame(cuadro);
	}, [pathname, hash, key]);
}
