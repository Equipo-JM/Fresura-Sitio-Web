import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useState } from "react";
import "../../compartido/movimiento/sistema";

/**
 * Id de la categoría cuya sección ocupa ahora el centro de la pantalla, para
 * marcar su botón en la navegación del menú. `null` antes de la primera.
 */
export function useCategoriaActiva(ids: string[]): string | null {
	const [activa, setActiva] = useState<string | null>(null);
	const clave = ids.join(",");
	useEffect(() => {
		const disparadores = clave
			.split(",")
			.map((id) => {
				const seccion = document.getElementById(`cat-${id}`);
				if (!seccion) return null;
				return ScrollTrigger.create({
					trigger: seccion,
					start: "top 50%",
					end: "bottom 50%",
					onToggle: (estado) => {
						if (estado.isActive) setActiva(id);
					},
				});
			})
			.filter((d) => d !== null);
		return () => {
			for (const d of disparadores) d.kill();
		};
	}, [clave]);
	return activa;
}
