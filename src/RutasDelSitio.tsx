import { Route, Routes } from "react-router";
import { PaginaPanel } from "./panel/PaginaPanel";
import { MarcoDelSitio } from "./sitio/MarcoDelSitio";
import { PaginaCarrito } from "./sitio/PaginaCarrito";
import { PaginaInicio } from "./sitio/PaginaInicio";
import { PaginaNoEncontrada } from "./sitio/PaginaNoEncontrada";
import { PaginaPersonalizar } from "./sitio/PaginaPersonalizar";
import { PaginaPrivacidad } from "./sitio/PaginaPrivacidad";
import { PaginaProducto } from "./sitio/PaginaProducto";

/**
 * Rutas de la aplicación en modo declarativo (ADR-001, D1). Las páginas
 * públicas comparten encabezado y pie a través de `MarcoDelSitio`.
 * `/admin` es, por ahora, el panel de demostración (cambio de fotos); el panel
 * real con Supabase lo reemplaza en la etapa 3.
 */
export function RutasDelSitio() {
	return (
		<Routes>
			<Route path="/admin" element={<PaginaPanel />} />
			<Route element={<MarcoDelSitio />}>
				<Route path="/" element={<PaginaInicio />} />
				<Route path="/producto/:idProducto" element={<PaginaProducto />} />
				<Route
					path="/personalizar/:idProducto"
					element={<PaginaPersonalizar />}
				/>
				<Route path="/carrito" element={<PaginaCarrito />} />
				<Route path="/privacidad" element={<PaginaPrivacidad />} />
				<Route path="*" element={<PaginaNoEncontrada />} />
			</Route>
		</Routes>
	);
}
