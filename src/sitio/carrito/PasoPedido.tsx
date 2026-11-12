import { Link } from "react-router";
import type { Contenido } from "../../../supabase/functions/_shared/esquemas/contenido";
import {
	claveLinea,
	MAX_LINEAS,
	MAX_UNIDADES,
	nombreProducto,
	pesos,
	precioLinea,
} from "../../compartido/carrito/reglas";
import { useCarrito } from "../../compartido/carrito/useCarrito";
import { FotoPendiente } from "../../compartido/componentes/FotoPendiente";
import { Icono } from "../../compartido/componentes/Icono";
import { tieneFoto } from "../../compartido/contenido/fotos";

/** Paso 1: lo que lleva la persona, con cantidades y quitar. */
export function PasoPedido({
	contenido,
	onContinuar,
}: {
	contenido: Contenido;
	onContinuar: () => void;
}) {
	const { lineas, cambiarCantidad, quitar } = useCarrito();

	if (lineas.length === 0) {
		return (
			<div className="vacio-caja">
				<h1>
					Tu carrito está <em>vacío</em>
				</h1>
				<p>Crea tu Fresura ideal y aquí la verás.</p>
				<Link className="boton" to="/#menu">
					Ver el menú
				</Link>
			</div>
		);
	}

	return (
		<>
			<h1 id="titulo-paso" tabIndex={-1}>
				Tu <em>pedido</em>
			</h1>
			<ul className="lineas-c">
				{lineas.map((linea, indice) => {
					const producto = contenido.productos.find(
						(p) => p.id === linea.idProducto,
					);
					if (!producto) return null;
					const presentacion = producto.presentaciones.find(
						(p) => p.id === linea.idPresentacion,
					);
					const precio = precioLinea(producto, linea);
					const nombre = nombreProducto(producto, contenido.categorias);
					return (
						<li className="linea-c" key={claveLinea(linea)}>
							<div className="miniatura">
								{tieneFoto(producto.imagen) ? (
									<img
										className="mini-foto"
										src={producto.imagen.ruta}
										alt=""
									/>
								) : (
									<FotoPendiente texto="" />
								)}
							</div>
							<div className="linea-datos">
								<p className="linea-titulo">{nombre}</p>
								{presentacion && <p className="chico">{presentacion.nombre}</p>}
								{producto.grupos_opciones.map((grupo) => {
									const elegidas = linea.seleccion[grupo.id] ?? [];
									if (elegidas.length === 0) return null;
									const nombres = grupo.opciones
										.filter((o) => elegidas.includes(o.id))
										.map((o) => o.nombre);
									return (
										<p className="chico" key={grupo.id}>
											{grupo.nombre}: {nombres.join(", ")}
										</p>
									);
								})}
								{linea.indicaciones && (
									<p className="chico">Indicaciones: {linea.indicaciones}</p>
								)}
							</div>
							<div className="linea-pie">
								<fieldset
									className="cantidad"
									aria-label={`Cantidad de ${nombre}`}
								>
									<button
										type="button"
										className="redondo"
										aria-label={`Quitar una unidad de ${nombre}`}
										disabled={linea.cantidad <= 1}
										onClick={() => cambiarCantidad(indice, -1)}
									>
										<Icono nombre="menos" />
									</button>
									<span className="num" aria-live="polite">
										{linea.cantidad}
									</span>
									<button
										type="button"
										className="redondo"
										aria-label={`Agregar una unidad de ${nombre}`}
										disabled={linea.cantidad >= MAX_UNIDADES}
										onClick={() => cambiarCantidad(indice, 1)}
									>
										<Icono nombre="mas" />
									</button>
								</fieldset>
								<span className="linea-precio">
									{precio === null ? "Precio por confirmar" : pesos(precio)}
								</span>
								<button
									type="button"
									className="boton-texto"
									onClick={() => quitar(indice)}
								>
									Quitar<span className="oculto"> {nombre}</span>
								</button>
							</div>
						</li>
					);
				})}
			</ul>
			<p className="chico">
				{lineas.length} de {MAX_LINEAS} productos. Hasta {MAX_UNIDADES} unidades
				por producto.
			</p>
			<div className="accion-en-linea">
				<button type="button" className="boton" onClick={onContinuar}>
					Continuar a la entrega
				</button>
			</div>
		</>
	);
}
