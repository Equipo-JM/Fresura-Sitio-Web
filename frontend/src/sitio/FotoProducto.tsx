import type { Producto } from "../compartido/carrito/reglas";
import { FotoEjemplo } from "../compartido/componentes/FotoEjemplo";
import { fotoRappi, tieneFoto } from "../compartido/contenido/fotos";

/**
 * Foto publicada prioritaria; a falta de ella, la provisional de Rappi y, si
 * tampoco hay, referencias y fresas de DD-43.
 */
export function FotoProducto({
	producto,
	enBeige = false,
	segunda = false,
}: {
	producto: Producto;
	enBeige?: boolean;
	segunda?: boolean;
}) {
	if (tieneFoto(producto.imagen))
		return (
			<img
				src={producto.imagen.ruta}
				alt={segunda ? "" : producto.imagen.alt}
				width={producto.imagen.ancho}
				height={producto.imagen.alto}
				loading="lazy"
			/>
		);
	const provisional = fotoRappi(producto.id);
	if (provisional)
		return (
			<>
				<img
					src={provisional}
					alt={segunda ? "" : `${producto.nombre}, foto provisional`}
					// Casi todas son cuadradas; el marco las recorta con `object-fit`,
					// así que estas medidas solo reservan espacio mientras carga.
					width="500"
					height="500"
					loading="lazy"
				/>
			</>
		);
	const chocolate = producto.categoria === "chocolate";
	const textura = producto.nombre.startsWith("Arma tu");
	return (
		<>
			<div className={segunda ? "cara-contenido" : "cara a"}>
				{textura && !segunda ? (
					<img
						src="/ejemplos/textura-crema.webp"
						alt="Textura de crema, foto de referencia"
						width="600"
						height="600"
						loading="lazy"
					/>
				) : chocolate ? (
					<FotoEjemplo
						src="/ejemplos/portada-vaso.webp"
						alt="Vaso transparente con fresas y chocolate cayendo, foto de referencia"
						ancho={800}
						alto={1200}
						marcada={false}
					/>
				) : (
					<div
						className={`foto-pendiente ${enBeige || (!segunda && producto.orden % 2 === 1) ? "fondo-peep" : "fondo-dust"}`}
					>
						<img
							src={
								segunda && !enBeige
									? "/marca/fresa-porcini.svg"
									: "/marca/fresa-flamingo.svg"
							}
							alt=""
							width="72"
							height="102"
						/>
					</div>
				)}
			</div>
		</>
	);
}
