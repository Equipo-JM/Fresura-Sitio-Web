import { Link } from "react-router";
import type { Contenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";
import { nombreProducto, pesos } from "../../compartido/carrito/reglas";
import { Icono } from "../../compartido/componentes/Icono";
import { FotoProducto } from "../FotoProducto";
import { MarcaPorValidar } from "../MarcaPorValidar";
import { DATOS_CATEGORIAS, FRASES_CATEGORIAS } from "./copy";
import { useCarrusel } from "./useCarrusel";

type Producto = Contenido["productos"][number];

/** Menú completo: una sección por categoría, en el orden del contrato. */
export function Categorias({
	contenido,
	respaldo = false,
}: {
	contenido: Contenido;
	respaldo?: boolean;
}) {
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
									{DATOS_CATEGORIAS[categoria.id] ?? tamanos}
									<MarcaPorValidar />
								</p>
							</div>
							<Fila
								productos={productos}
								respaldo={respaldo}
								categorias={contenido.categorias}
								enBeige={indice % 2 === 1}
							/>
						</div>
					</section>
				);
			})}
		</div>
	);
}

/** Productos de una categoría. Con más de tres, se desplazan en horizontal con flechas. */
function Fila({
	productos,
	categorias,
	enBeige,
	respaldo,
}: {
	productos: Producto[];
	categorias: Contenido["categorias"];
	enBeige: boolean;
	respaldo: boolean;
}) {
	const { carril, posicion, paginas, actualizar, desplazar } = useCarrusel(
		productos.length,
	);
	const tarjetas = productos.map((producto) => (
		<li key={producto.id}>
			<TarjetaProducto
				producto={producto}
				categorias={categorias}
				enBeige={enBeige}
				respaldo={respaldo}
			/>
		</li>
	));
	if (productos.length <= 3)
		return <ul className="fila-productos">{tarjetas}</ul>;

	return (
		<div className="carrusel">
			<ul
				className="fila-productos carril"
				ref={carril}
				// biome-ignore lint/a11y/noNoninteractiveTabindex: el carril permite desplazarse con el teclado además de las flechas visibles.
				tabIndex={0}
				aria-label="Productos, usa las flechas para moverte"
				onScroll={actualizar}
				onKeyDown={(e) => {
					if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
						e.preventDefault();
						desplazar(e.key === "ArrowRight" ? 1 : -1);
					}
				}}
			>
				{tarjetas}
			</ul>
			<div className="carrusel-control">
				<button
					type="button"
					className="redondo"
					onClick={() => desplazar(-1)}
					aria-label="Anterior"
					aria-disabled={posicion <= 1}
				>
					<Icono nombre="izquierda" />
				</button>
				<span className="carrusel-posicion" aria-live="polite">
					{posicion} de {paginas}
				</span>
				<button
					type="button"
					className="redondo"
					onClick={() => desplazar(1)}
					aria-label="Siguiente"
					aria-disabled={posicion >= paginas}
				>
					<Icono nombre="derecha" />
				</button>
			</div>
		</div>
	);
}

/** Tarjeta de producto: lleva a la ficha. El precio aparece solo si está publicado. */
export function TarjetaProducto({
	producto,
	categorias = [],
	enBeige = false,
	respaldo = false,
}: {
	producto: Producto;
	categorias?: Contenido["categorias"];
	enBeige?: boolean;
	respaldo?: boolean;
}) {
	const precios = producto.presentaciones
		.map((p) => p.precio)
		.filter((p): p is number => p !== null);
	const precio =
		precios.length > 0
			? `Desde ${pesos(Math.min(...precios))}`
			: respaldo
				? "Consulta precios por WhatsApp"
				: "Precio por confirmar";
	return (
		<Link
			className="tarjeta"
			to={`/producto/${producto.id}`}
			aria-label={`${nombreProducto(producto, categorias)}, ${precio}, ver ficha`}
		>
			<div className="tarjeta-foto">
				<FotoProducto producto={producto} enBeige={enBeige} />
				{producto.categoria !== "chocolate" && (
					<div className="cara b" aria-hidden="true">
						<FotoProducto producto={producto} enBeige={enBeige} segunda />
					</div>
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
