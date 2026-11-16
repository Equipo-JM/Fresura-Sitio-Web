import { Link, useParams } from "react-router";
import { nombreProducto, pesos } from "../compartido/carrito/reglas";
import { Icono } from "../compartido/componentes/Icono";
import { ConContenido } from "./ConContenido";
import { FotoProducto } from "./FotoProducto";
import { MarcaPorValidar } from "./MarcaPorValidar";
import { PaginaNoEncontrada } from "./PaginaNoEncontrada";

/** Ficha de un producto: foto, tamaños, lo que incluye y las dos acciones. */
export function PaginaProducto() {
	const { idProducto } = useParams();
	return (
		<ConContenido>
			{(contenido, origen) => {
				const producto = contenido.productos.find((p) => p.id === idProducto);
				if (!producto) return <PaginaNoEncontrada />;
				const categoria = contenido.categorias.find(
					(c) => c.id === producto.categoria,
				);
				const precios = producto.presentaciones
					.map((p) => p.precio)
					.filter((p): p is number => p !== null);
				const sinPrecio = producto.presentaciones.every(
					(p) => p.precio === null,
				);
				const numeroWhatsapp = contenido.negocio.whatsapp;
				const mensajeWhatsapp = encodeURIComponent(
					`Hola, Fresura. Quiero preguntar por ${nombreProducto(producto, contenido.categorias)}.`,
				);
				return (
					<section className="pagina">
						<div className="envoltura">
							<Link className="volver" to="/#menu">
								← Volver al menú
							</Link>
							<div className="ficha">
								<div className="ficha-foto">
									<div className="tarjeta-foto">
										<FotoProducto producto={producto} />
									</div>
								</div>
								<div className="ficha-datos">
									<div className="ficha-titulo">
										<h1>
											{nombreProducto(producto, categoria ? [categoria] : [])}
										</h1>
										<p className="ficha-precio">
											{sinPrecio
												? origen === "respaldo"
													? "Consulta precios por WhatsApp"
													: "Precio por confirmar"
												: `Desde ${pesos(Math.min(...precios))}`}
										</p>
									</div>
									<div className="ficha-bloque">
										<div className="ficha-bloque-titulo">
											<h2>Descripción</h2>
											{contenido.estado === "ejemplo" && <MarcaPorValidar />}
										</div>
										<p>{producto.descripcion}</p>
									</div>
									{producto.caracteristicas.length > 0 && (
										<div className="ficha-bloque">
											<h2>Características</h2>
											<ul className="lista-marcada">
												{producto.caracteristicas.map((c) => (
													<li key={c}>{c}</li>
												))}
											</ul>
										</div>
									)}
									{origen === "principal" && (
										<div className="ficha-bloque">
											<div className="ficha-bloque-titulo">
												<h2>Tamaños</h2>
												{contenido.estado === "ejemplo" && <MarcaPorValidar />}
											</div>
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
									)}
									{producto.grupos_opciones
										.filter((g) => g.id === "toppings")
										.map((g) => (
											<div className="ficha-bloque" key={g.id}>
												<div className="ficha-bloque-titulo">
													<h2>Toppings</h2>
													{contenido.estado === "ejemplo" && (
														<MarcaPorValidar />
													)}
												</div>
												<ul className="chips">
													{g.opciones.map((o) => (
														<li key={o.id}>{o.nombre}</li>
													))}
												</ul>
											</div>
										))}
									<div className="acciones">
										{/* En respaldo el carrito está desactivado (DD-14): solo queda WhatsApp. */}
										{origen === "principal" ? (
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
											{origen === "respaldo"
												? "Consulta precios por WhatsApp"
												: "Preguntar por WhatsApp"}
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
