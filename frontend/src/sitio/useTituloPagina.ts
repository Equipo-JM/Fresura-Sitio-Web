import { useEffect } from "react";
import { useLocation } from "react-router";

/** Actualiza la pestaña al navegar, también al volver desde una ruta desconocida. */
export function useTituloPagina() {
	const { pathname } = useLocation();
	useEffect(() => {
		const titulo =
			pathname === "/"
				? "Fresura, dulce pero con estilo"
				: pathname.startsWith("/producto/")
					? "Ficha de producto · Fresura"
					: pathname.startsWith("/personalizar/")
						? "Personaliza · Fresura"
						: pathname === "/carrito"
							? "Carrito · Fresura"
							: pathname === "/sedes"
								? "Sedes y contacto · Fresura"
								: pathname === "/privacidad"
									? "Política de datos · Fresura"
									: "Fresura";
		document.title = titulo;
	}, [pathname]);
}
