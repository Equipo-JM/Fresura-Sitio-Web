import { useRef } from "react";
import { Link } from "react-router";
import type { Contenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";
import { nombreProducto, pesos } from "../../compartido/carrito/reglas";
import { Icono } from "../../compartido/componentes/Icono";
import { FotoProducto } from "../FotoProducto";
import { useAbanico } from "./useAbanico";

type Producto = Contenido["productos"][number];

/** «Desde $…» del producto, o el aviso que corresponda si no tiene precio. */
export function precioDesde(producto: Producto, respaldo: boolean): string {
	const precios = producto.presentaciones
		.map((p) => p.precio)
		.filter((p): p is number => p !== null);
	if (precios.length > 0) return `Desde ${pesos(Math.min(...precios))}`;
	return respaldo ? "Consulta precios por WhatsApp" : "Precio por confirmar";
}

/** Onzas del producto si tiene una sola presentación en onzas («9 oz» → "9"). */
export function onzasDe(producto: Producto): string | null {
	if (producto.presentaciones.length !== 1) return null;
	return producto.presentaciones[0].nombre.match(/^(\d+)\s*oz$/i)?.[1] ?? null;
}

/**
 * Productos en abanico: la elegida al frente y una a cada lado, giradas. La
 * elegida lleva a su ficha; tocar una vecina la trae al frente. El movimiento
 * entre una y otra lo hace `useAbanico`.
 */
export function Abanico({
	productos,
	elegido,
	alElegir,
	categorias,
	respaldo,
}: {
	productos: Producto[];
	elegido: number;
	alElegir: (indice: number) => void;
	categorias: Contenido["categorias"];
	respaldo: boolean;
}) {
	const escena = useRef<HTMLDivElement>(null);
	useAbanico(escena, elegido, productos.length);
	return (
		<div className="abanico" ref={escena}>
			{productos.map((producto, indice) => (
				<div
					className="abanico-carta"
					data-activa={indice === elegido}
					key={producto.id}
				>
					<div className="abanico-entrada">
						<TarjetaAbanico
							producto={producto}
							activa={indice === elegido}
							alElegir={() => alElegir(indice)}
							categorias={categorias}
							respaldo={respaldo}
						/>
					</div>
				</div>
			))}
		</div>
	);
}

/** Tarjeta en arco del abanico, con el sello de onzas cuando el producto lo tiene. */
function TarjetaAbanico({
	producto,
	activa,
	alElegir,
	categorias,
	respaldo,
}: {
	producto: Producto;
	activa: boolean;
	alElegir: () => void;
	categorias: Contenido["categorias"];
	respaldo: boolean;
}) {
	const precio = precioDesde(producto, respaldo);
	const onzas = onzasDe(producto);
	const contenido = (
		<>
			<div className="abanico-foto">
				<FotoProducto producto={producto} />
			</div>
			{onzas && (
				<span className="abanico-sello" aria-hidden="true">
					<span>{onzas}</span>
					<span>oz</span>
				</span>
			)}
			<span className="abanico-info">
				<span className="abanico-textos">
					<span className="abanico-nombre">{producto.nombre}</span>
					<span className="abanico-precio">{precio}</span>
				</span>
				<span className="abanico-elegir" aria-hidden="true">
					Elegir <Icono nombre="derecha" />
				</span>
			</span>
		</>
	);
	if (activa)
		return (
			<Link
				className="abanico-tarjeta"
				to={`/producto/${producto.id}`}
				aria-label={`${nombreProducto(producto, categorias)}, ${precio}, ver ficha`}
			>
				{contenido}
			</Link>
		);
	// Las vecinas solo responden al puntero: con teclado se llega a ellas con
	// las flechas o los botones del panel, sin sumar paradas de tabulación.
	return (
		<button
			type="button"
			className="abanico-tarjeta"
			tabIndex={-1}
			aria-label={`Traer al frente ${producto.nombre}`}
			onClick={alElegir}
		>
			{contenido}
		</button>
	);
}

/** Fresa del indicador de posición: llena la elegida y en contorno las demás. */
export function FresaPosicion({ activa }: { activa: boolean }) {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" className="fresa-posicion">
			<path
				d="M12 7c4.5 0 7.5 2.2 7.5 5.5C19.5 17 15 21.5 12 21.5S4.5 17 4.5 12.5C4.5 9.2 7.5 7 12 7z"
				fill={activa ? "var(--color-flamingo)" : "var(--color-platinum)"}
				stroke="var(--color-peat-brown)"
				strokeWidth="1.5"
			/>
			<path
				d="M12 7c-1-2-3-3-5-3 1 2 2.5 3 5 3zm0 0c1-2 3-3 5-3-1 2-2.5 3-5 3z"
				fill="var(--color-court-bouillon)"
				stroke="var(--color-peat-brown)"
				strokeWidth="1.2"
			/>
		</svg>
	);
}
