import type { Producto } from "../compartido/carrito/reglas";
import { FotoEjemplo } from "../compartido/componentes/FotoEjemplo";
import { tieneFoto } from "../compartido/contenido/fotos";

/** Foto publicada prioritaria; a falta de ella, referencias y fresas de DD-43. */
export function FotoProducto({
	producto,
	enBeige = false,
	segunda = false,
	marcada = true,
}: {
	producto: Producto;
	enBeige?: boolean;
	segunda?: boolean;
	marcada?: boolean;
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
	const chocolate = producto.categoria === "chocolate";
	const textura = producto.nombre.startsWith("Arma tu");
	return (
		<>
			{marcada && !segunda && <span className="pv pv-foto">Por validar</span>}
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
						<span>
							{segunda ? "Segunda foto por validar" : "Foto por validar"}
						</span>
					</div>
				)}
			</div>
		</>
	);
}
