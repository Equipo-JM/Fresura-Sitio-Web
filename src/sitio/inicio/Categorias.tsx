import { useRef } from "react";
import { Link } from "react-router";
import type { Contenido } from "../../../supabase/functions/_shared/esquemas/contenido";
import { pesos } from "../../compartido/carrito/reglas";
import { FotoPendiente } from "../../compartido/componentes/FotoPendiente";
import { Icono } from "../../compartido/componentes/Icono";
import { tieneFoto } from "../../compartido/contenido/fotos";
import { MarcaPorValidar } from "../MarcaPorValidar";
import { FRASES_CATEGORIAS } from "./copy";

type Producto = Contenido["productos"][number];

/** Menú completo: una sección por categoría, en el orden del contrato. */
export function Categorias({ contenido }: { contenido: Contenido }) {
	const categorias = [...contenido.categorias].sort(
		(a, b) => a.orden - b.orden,
	);
	return (
		<div id="menu">
			{categorias.map((categoria, indice) => {
				const productos = contenido.productos
					.filter((p) => p.categoria === categoria.id && p.vigente)
					.sort((a, b) => a.orden - b.orden);
				if (productos.length === 0) return null;
				const tamanos = productos[0].presentaciones
					.map((p) => p.nombre)
					.join(", ");
				return (
					<section
						key={categoria.id}
						id={`cat-${categoria.id}`}
						className={`seccion capa ${indice % 2 === 1 ? "fondo-dust" : ""}`}
						aria-labelledby={`titulo-${categoria.id}`}
					>
						<div className="envoltura">
							<div className="capa-encabezado">
								<h2 id={`titulo-${categoria.id}`} tabIndex={-1}>
									{categoria.nombre}
								</h2>
								{FRASES_CATEGORIAS[categoria.id] && (
									<p className="capa-frase">
										{FRASES_CATEGORIAS[categoria.id]}
									</p>
								)}
								<p className="capa-dato">
									{tamanos}
									<MarcaPorValidar />
								</p>
							</div>
							<Fila productos={productos} />
						</div>
					</section>
				);
			})}
		</div>
	);
}

/** Productos de una categoría. Con más de tres, se desplazan en horizontal con flechas. */
function Fila({ productos }: { productos: Producto[] }) {
	const carril = useRef<HTMLUListElement>(null);
	const tarjetas = productos.map((producto) => (
		<li key={producto.id}>
			<TarjetaProducto producto={producto} />
		</li>
	));
	if (productos.length <= 3)
		return <ul className="fila-productos">{tarjetas}</ul>;

	function desplazar(sentido: number) {
		const el = carril.current;
		if (!el) return;
		el.scrollBy({ left: sentido * el.clientWidth * 0.8, behavior: "smooth" });
	}

	return (
		<div className="carrusel">
			<ul className="fila-productos carril" ref={carril}>
				{tarjetas}
			</ul>
			<div className="carrusel-control">
				<button
					type="button"
					className="redondo"
					onClick={() => desplazar(-1)}
					aria-label="Anterior"
				>
					<Icono nombre="izquierda" />
				</button>
				<button
					type="button"
					className="redondo"
					onClick={() => desplazar(1)}
					aria-label="Siguiente"
				>
					<Icono nombre="derecha" />
				</button>
			</div>
		</div>
	);
}

/** Tarjeta de producto: lleva a la ficha. El precio aparece solo si está publicado. */
export function TarjetaProducto({ producto }: { producto: Producto }) {
	const precios = producto.presentaciones
		.map((p) => p.precio)
		.filter((p): p is number => p !== null);
	const precio =
		precios.length > 0
			? `Desde ${pesos(Math.min(...precios))}`
			: "Consulta precios por WhatsApp";
	return (
		<Link
			className="tarjeta"
			to={`/producto/${producto.id}`}
			aria-label={`${producto.nombre}, ${precio}, ver ficha`}
		>
			<div className="tarjeta-foto">
				{tieneFoto(producto.imagen) ? (
					<img
						src={producto.imagen.ruta}
						alt={producto.imagen.alt}
						loading="lazy"
					/>
				) : (
					<FotoPendiente />
				)}
			</div>
			<div className="tarjeta-info">
				<span className="tarjeta-nombre">{producto.nombre}</span>
				<span className="tarjeta-pie">
					<span className="tarjeta-precio">{precio}</span>
					<span className="tarjeta-elegir" aria-hidden="true">
						Elegir <Icono nombre="derecha" />
					</span>
				</span>
			</div>
		</Link>
	);
}
