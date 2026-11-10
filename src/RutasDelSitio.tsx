import { Route, Routes } from "react-router";
import { MarcoDelSitio } from "./sitio/MarcoDelSitio";
import { PaginaInicio } from "./sitio/PaginaInicio";
import { PaginaNoEncontrada } from "./sitio/PaginaNoEncontrada";
import { PaginaPrivacidad } from "./sitio/PaginaPrivacidad";

/**
 * Rutas de la aplicación en modo declarativo (ADR-001, D1). Las páginas
 * públicas comparten encabezado y pie a través de `MarcoDelSitio`.
 * El panel se agregará bajo `/admin` en la etapa 3.
 */
export function RutasDelSitio() {
	return (
		<Routes>
			<Route element={<MarcoDelSitio />}>
				<Route path="/" element={<PaginaInicio />} />
				<Route path="/privacidad" element={<PaginaPrivacidad />} />
				<Route path="*" element={<PaginaNoEncontrada />} />
			</Route>
		</Routes>
	);
}
