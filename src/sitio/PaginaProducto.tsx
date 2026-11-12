import { Link, useParams } from "react-router";
import { pesos } from "../compartido/carrito/reglas";
import { FotoPendiente } from "../compartido/componentes/FotoPendiente";
import { Icono } from "../compartido/componentes/Icono";
import { tieneFoto } from "../compartido/contenido/fotos";
import { ConContenido } from "./ConContenido";
import { MarcaPorValidar } from "./MarcaPorValidar";

/** Ficha de un producto: foto, tamaños, lo que incluye y las dos acciones. */
export function PaginaProducto() {
	const { idProducto } = useParams();
	return (
		<ConContenido>
			{(contenido) => {
				const producto = contenido.productos.find((p) => p.id === idProducto);
				if (!producto) return <SinProducto />;
				const categoria = contenido.categorias.find(
					(c) => c.id === producto.categoria,
				);
				const sinPrecio = producto.presentaciones.every(
					(p) => p.precio === null,
				);
				const numeroWhatsapp = contenido.negocio.whatsapp;
				const mensajeWhatsapp = encodeURIComponent(
					`Hola, Fresura. Quiero preguntar por ${producto.nombre}.`,
				);
				return (
					<section className="pagina">
						<div className="envoltura">
							<Link className="volver" to="/#menu">
								<Icono nombre="atras" /> Volver al menú
							</Link>
							<div className="ficha">
								<div className="ficha-foto">
									{tieneFoto(producto.imagen) ? (
										<img src={producto.imagen.ruta} alt={producto.imagen.alt} />
									) : (
										<FotoPendiente />
									)}
								</div>
								<div className="ficha-datos">
									<div className="ficha-titulo">
										<p className="antetitulo">{categoria?.nombre}</p>
										<h1>{producto.nombre}</h1>
										<p className="ficha-precio">
											{sinPrecio
												? "Consulta precios por WhatsApp"
												: "Precio por tamaño"}
										</p>
									</div>
									<div className="ficha-bloque">
										<h2>Descripción</h2>
										<p>{producto.descripcion}</p>
										{contenido.estado === "ejemplo" && <MarcaPorValidar />}
									</div>
									<div className="ficha-bloque">
										<h2>Tamaños</h2>
										<table className="tabla-precios">
											<caption className="oculto">Tamaños y precios</caption>
											<tbody>
												{producto.presentaciones.map((p) => (
													<tr key={p.id}>
														<th scope="row">{p.nombre}</th>
														<td>
															{p.precio === null
																? "Precio por confirmar"
																: pesos(p.precio)}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
									{producto.caracteristicas.length > 0 && (
										<div className="ficha-bloque">
											<h2>Incluye</h2>
											<ul className="lista-marcada">
												{producto.caracteristicas.map((c) => (
													<li key={c}>{c}</li>
												))}
											</ul>
										</div>
									)}
									<div className="acciones">
										{producto.grupos_opciones.length > 0 ||
										producto.presentaciones.length > 0 ? (
											<Link
												className="boton"
												to={`/personalizar/${producto.id}`}
											>
												Elegir y agregar al carrito
											</Link>
										) : null}
										<a
											className="boton secundario"
											href={`https://wa.me/${numeroWhatsapp}?text=${mensajeWhatsapp}`}
											target="_blank"
											rel="noopener noreferrer"
										>
											<Icono nombre="chat" />
											Preguntar por WhatsApp
										</a>
									</div>
								</div>
							</div>
						</div>
					</section>
				);
			}}
		</ConContenido>
	);
}

function SinProducto() {
	return (
		<section className="pagina">
			<div className="envoltura texto-largo">
				<h1>No encontramos este producto</h1>
				<Link className="boton" to="/#menu">
					Volver al menú
				</Link>
			</div>
		</section>
	);
}
