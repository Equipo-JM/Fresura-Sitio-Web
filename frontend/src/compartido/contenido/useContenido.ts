import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { FuenteContenido } from "./FuenteContenido";
import { obtenerContenido } from "./obtenerContenido";

/**
 * Contenido del sitio con caché de TanStack Query. Todas las páginas comparten
 * una sola lectura; con el respaldo, `data.origen` vale `"respaldo"`.
 */
export function useContenido() {
	const fuente = useContext(FuenteContenido);
	return useQuery({
		queryKey: fuente ? ["contenido-vista-previa", fuente] : ["contenido"],
		queryFn: () => (fuente ? Promise.resolve(fuente) : obtenerContenido()),
		// El contenido cambia poco: se vuelve a pedir tras 5 minutos.
		staleTime: 5 * 60 * 1000,
	});
}
