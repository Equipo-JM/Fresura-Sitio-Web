import { Route, Routes } from "react-router";
import { PaginaPanel } from "./panel/PaginaPanel";
import { MarcoDelSitio } from "./sitio/MarcoDelSitio";
import { PaginaAyuda } from "./sitio/PaginaAyuda";
import { PaginaCarrito } from "./sitio/PaginaCarrito";
import { PaginaInicio } from "./sitio/PaginaInicio";
import { PaginaMenu } from "./sitio/PaginaMenu";
import { PaginaNoEncontrada } from "./sitio/PaginaNoEncontrada";
import { PaginaNosotros } from "./sitio/PaginaNosotros";
import { PaginaPersonalizar } from "./sitio/PaginaPersonalizar";
import { PaginaPrivacidad } from "./sitio/PaginaPrivacidad";
import { PaginaProducto } from "./sitio/PaginaProducto";
import { PaginaPromociones } from "./sitio/PaginaPromociones";
import { PaginaSedes } from "./sitio/PaginaSedes";

/**
 * Rutas de la aplicación en modo declarativo (ADR-001, D1). Las páginas
 * públicas comparten encabezado y pie a través de `MarcoDelSitio`.
 * La vista previa reutiliza todas las rutas públicas bajo su propia base,
 * con la sesión del panel comprobada antes de leer el borrador.
 */
export function RutasDelSitio({
	vistaPrevia = false,
}: {
	vistaPrevia?: boolean;
}) {
	if (vistaPrevia) return <PaginaPanel vistaPrevia={<RutasPublicas />} />;
	return (
		<Routes>
			<Route path="/admin" element={<PaginaPanel />} />
			<Route path="/*" element={<RutasPublicas />} />
		</Routes>
	);
}

function RutasPublicas() {
	return (
		<Routes>
			<Route element={<MarcoDelSitio />}>
				<Route path="/" element={<PaginaInicio />} />
				<Route path="/menu" element={<PaginaMenu />} />
				<Route path="/promociones" element={<PaginaPromociones />} />
				<Route path="/nosotros" element={<PaginaNosotros />} />
				<Route path="/ayuda" element={<PaginaAyuda />} />
				<Route path="/producto/:idProducto" element={<PaginaProducto />} />
				<Route
					path="/personalizar/:idProducto"
					element={<PaginaPersonalizar />}
				/>
				<Route path="/carrito" element={<PaginaCarrito />} />
				<Route path="/privacidad" element={<PaginaPrivacidad />} />
				<Route path="/sedes" element={<PaginaSedes />} />
				<Route path="*" element={<PaginaNoEncontrada />} />
			</Route>
		</Routes>
	);
}
