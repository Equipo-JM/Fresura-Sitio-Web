import type { Contenido } from "../../../supabase/functions/_shared/esquemas/contenido";
import { claveProducto, type FotoDemo } from "./almacenFotosDemo";

/**
 * Contenido con las fotos del panel de demostración en lugar de las del
 * contrato. Sin fotos cambiadas devuelve el mismo objeto, sin copiarlo.
 */
export function aplicarFotosDemo(
	contenido: Contenido,
	fotos: Record<string, FotoDemo>,
): Contenido {
	if (Object.keys(fotos).length === 0) return contenido;
	return {
		...contenido,
		productos: contenido.productos.map((producto) => {
			const foto = fotos[claveProducto(producto.id)];
			return foto
				? {
						...producto,
						imagen: { ...producto.imagen, ruta: foto.url, alt: foto.alt },
					}
				: producto;
		}),
	};
}
