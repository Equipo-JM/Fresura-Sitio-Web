import type { Producto } from "../../compartido/carrito/reglas";
import { FotoProducto } from "../FotoProducto";

/** Miniatura de la misma foto del catálogo, con cantidad visible en el resumen. */
export function MiniaturaProducto({
	producto,
	cantidad,
}: {
	producto: Producto;
	cantidad?: number;
}) {
	return (
		<div className="miniatura" aria-hidden="true">
			<FotoProducto producto={producto} />
			{cantidad !== undefined && (
				<span className="insignia">
					{cantidad}
					<span className="oculto"> unidades</span>
				</span>
			)}
		</div>
	);
}
