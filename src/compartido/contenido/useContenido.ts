import { useQuery } from "@tanstack/react-query";
import { obtenerContenido } from "./obtenerContenido";

/**
 * Contenido del sitio con caché de TanStack Query. Todas las páginas comparten
 * una sola lectura; con el respaldo, `data.origen` vale `"respaldo"`.
 */
export function useContenido() {
	return useQuery({
		queryKey: ["contenido"],
		queryFn: () => obtenerContenido(),
		// El contenido cambia poco: se vuelve a pedir tras 5 minutos.
		staleTime: 5 * 60 * 1000,
	});
}
