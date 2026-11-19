import { useRef } from "react";
import type { Contenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";
import { useAvanceCarril } from "../useAvanceCarril";
import { FresaPosicion, TarjetaAbanico } from "./Abanico";
import { useEntradaCarril } from "./useEntradaCarril";

type Producto = Contenido["productos"][number];

/**
 * Carril horizontal de productos para celular, con las mismas tarjetas en arco
 * del abanico: cada una trae foto, nombre, precio y «Elegir» juntos, y la
 * siguiente asoma por el borde para invitar a deslizar. Debajo, las fresas
 * marcan la posición y llevan a cada tarjeta. Sustituye en pantallas angostas
 * al abanico, cuyas tarjetas flotantes se salían de su sección y obligaban a
 * subir y bajar entre la foto y sus datos.
 */
export function CarrilProductos({
	productos,
	categorias,
	respaldo,
	etiqueta,
}: {
	productos: Producto[];
	categorias: Contenido["categorias"];
	respaldo: boolean;
	/** Nombre accesible del carril, por ejemplo «Productos de Fresitas». */
	etiqueta: string;
}) {
	const carril = useRef<HTMLUListElement>(null);
	const { actual, irA } = useAvanceCarril(carril);
	useEntradaCarril(carril);
	const cantidad = productos.length;
	return (
		<div className="carril-productos-zona">
			<ul className="carril-productos" ref={carril} aria-label={etiqueta}>
				{productos.map((producto, indice) => (
					<li key={producto.id} data-activa={indice === actual}>
						<TarjetaAbanico
							producto={producto}
							activa
							conDescripcion
							alElegir={() => {}}
							categorias={categorias}
							respaldo={respaldo}
						/>
					</li>
				))}
			</ul>
			{cantidad > 1 && (
				<div className="vitrina-controles carril-avance">
					<div className="vitrina-fresas">
						{productos.map((producto, indice) => (
							<button
								key={producto.id}
								type="button"
								className="vitrina-fresa"
								aria-label={`Ver ${producto.nombre}`}
								aria-current={indice === actual}
								onClick={() => irA(indice)}
							>
								<FresaPosicion activa={indice === actual} />
							</button>
						))}
					</div>
					<p className="vitrina-contador" aria-hidden="true">
						{String(actual + 1).padStart(2, "0")} /{" "}
						{String(cantidad).padStart(2, "0")}
					</p>
				</div>
			)}
		</div>
	);
}
