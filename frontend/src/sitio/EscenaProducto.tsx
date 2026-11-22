import type { ReactNode } from "react";
import type { Producto } from "../compartido/carrito/reglas";
import { Calcomania } from "./Calcomania";
import { calcomaniasDeProducto } from "./calcomanias";
import { FotoProducto } from "./FotoProducto";

type Props = {
	producto: Producto;
	/** Contenido del arco en lugar de la foto (por ejemplo, el vaso que se arma). */
	centro?: ReactNode;
	/**
	 * Texto de la etiqueta café inclinada. Sin él se muestra la presentación, si
	 * el producto tiene una sola.
	 */
	etiqueta?: ReactNode;
	/** Lo que va debajo de la tarjeta, dentro de la misma columna. */
	pie?: ReactNode;
	/** Con `false` la tarjeta va sin las dos calcomanías (pedido para personalizar). */
	calcomanias?: boolean;
};

/**
 * Escena de la ficha: tarjeta We Peep con el trazo rosado, el arco con marco
 * crema, dos calcomanías que cambian según el producto y una etiqueta café
 * inclinada. La comparten la ficha y la pantalla de personalizar para que se
 * vean iguales.
 */
export function EscenaProducto({
	producto,
	centro,
	etiqueta,
	pie,
	calcomanias = true,
}: Props) {
	const [calcomaniaA, calcomaniaB] = calcomaniasDeProducto(producto.id);
	const texto =
		etiqueta ??
		(producto.presentaciones.length === 1
			? producto.presentaciones[0].nombre
			: null);
	return (
		<div className="ficha-foto">
			<div
				className={centro ? "ficha-escena ficha-escena-vaso" : "ficha-escena"}
			>
				<img
					className="deco ficha-trazo"
					src="/marca/trazo-3-flamingo.svg"
					alt=""
				/>
				<div className={centro ? "tarjeta-foto tarjeta-vaso" : "tarjeta-foto"}>
					{centro ?? <FotoProducto producto={producto} />}
				</div>
				{calcomanias && (
					<>
						<Calcomania
							nombre={calcomaniaA}
							className="ficha-calcomania ficha-calcomania-a"
						/>
						<Calcomania
							nombre={calcomaniaB}
							className="ficha-calcomania ficha-calcomania-b"
						/>
					</>
				)}
				{texto ? <span className="ficha-tamano">{texto}</span> : null}
			</div>
			{pie}
		</div>
	);
}
