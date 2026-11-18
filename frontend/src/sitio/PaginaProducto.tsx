import { useRef } from "react";
import { Link, useParams } from "react-router";
import { nombreProducto, pesos } from "../compartido/carrito/reglas";
import { Icono } from "../compartido/componentes/Icono";
import { useConteoPrecio } from "../compartido/movimiento/useConteoPrecio";
import { Calcomania } from "./Calcomania";
import { ConContenido } from "./ConContenido";
import { calcomaniasDeProducto } from "./calcomanias";
import { FotoProducto } from "./FotoProducto";
import { PaginaNoEncontrada } from "./PaginaNoEncontrada";
import { PromocionesFicha } from "./PromocionesFicha";
import { piezasIncluidas } from "./piezasIncluidas";

/**
 * Ficha de un producto: foto en arco con dos calcomanías que cambian según el
 * producto, precio en boleto, lo que incluye en estampas, tamaños, toppings y las
 * dos acciones.
 */
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
				const [calcomaniaA, calcomaniaB] = calcomaniasDeProducto(producto.id);
				const tamanoUnico =
					producto.presentaciones.length === 1
						? producto.presentaciones[0].nombre
						: null;
				const incluidas = producto.caracteristicas
					.map((texto) => ({ texto, piezas: piezasIncluidas(texto) }))
					.filter((c) => c.piezas !== null);
				const otras = producto.caracteristicas.filter(
					(texto) => piezasIncluidas(texto) === null,
				);
				return (
					<section className="pagina pagina-producto">
						<div className="envoltura">
							<Link className="volver" to="/menu">
								<span className="volver-flecha">←</span> Volver al menú
							</Link>
							<div className="ficha">
								<div className="ficha-foto">
									<div className="ficha-escena">
										<img
											className="deco ficha-trazo"
											src="/marca/trazo-3-flamingo.svg"
											alt=""
										/>
										<div className="tarjeta-foto">
											<FotoProducto producto={producto} />
										</div>
										<Calcomania
											nombre={calcomaniaA}
											className="ficha-calcomania ficha-calcomania-a"
										/>
										<Calcomania
											nombre={calcomaniaB}
											className="ficha-calcomania ficha-calcomania-b"
										/>
										{tamanoUnico ? (
											<span className="ficha-tamano">{tamanoUnico}</span>
										) : null}
									</div>
								</div>
								<div className="ficha-datos">
									<div className="ficha-titulo">
										<h1>
											{categoria ? (
												<>
													<span className="ficha-categoria">
														{categoria.nombre}:
													</span>{" "}
												</>
											) : null}
											<span className="ficha-nombre">{producto.nombre}</span>
										</h1>
										<div className="ficha-bloque">
											<h2 className="oculto">Descripción</h2>
											<p className="ficha-descripcion">
												{producto.descripcion}
											</p>
										</div>
										<p className="ficha-precio boleto">
											{sinPrecio ? (
												origen === "respaldo" ? (
													"Consulta precios por WhatsApp"
												) : (
													"Precio por confirmar"
												)
											) : (
												<PrecioDesde valor={Math.min(...precios)} />
											)}
										</p>
									</div>
									{origen === "principal" && (
										<PromocionesFicha
											contenido={contenido}
											idProducto={producto.id}
										/>
									)}
									{producto.caracteristicas.length > 0 && (
										<div className="ficha-bloque">
											<h2>Características</h2>
											{incluidas.map(({ texto, piezas }) => (
												<div className="ficha-incluye" key={texto}>
													<p className="oculto">{texto}</p>
													<ul className="estampas" aria-hidden="true">
														{piezas?.map((pieza) => (
															<li className="estampa" key={pieza.nombre}>
																{pieza.cantidad !== null && (
																	<span className="estampa-cantidad">
																		{pieza.cantidad}
																	</span>
																)}
																<span className="estampa-nombre">
																	{pieza.nombre}
																</span>
															</li>
														))}
													</ul>
												</div>
											))}
											{otras.length > 0 && (
												<ul className="lista-marcada">
													{otras.map((c) => (
														<li key={c}>{c}</li>
													))}
												</ul>
											)}
										</div>
									)}
									{origen === "principal" && (
										<div className="ficha-bloque">
											<div className="ficha-bloque-titulo">
												<h2>Tamaños</h2>
											</div>
											<table className="tabla-precios">
												<caption className="oculto">Tamaños y precios</caption>
												<tbody>
													{producto.presentaciones.map((p) => (
														<tr key={p.id} className="boleto">
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
												<div className="ficha-bloque-titulo ficha-toppings-titulo">
													<h2>Toppings</h2>
													{origen === "principal" && (
														<p>Los eliges al agregarlo al carrito</p>
													)}
												</div>
												<ul className="toppings-ficha">
													{g.opciones.map((o) => (
														<li className="topping-ficha" key={o.id}>
															{o.nombre}
														</li>
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

/** «Desde $…» con el número subiendo hasta el precio; el valor final se lee en texto oculto. */
function PrecioDesde({ valor }: { valor: number }) {
	const numero = useRef<HTMLSpanElement>(null);
	useConteoPrecio(numero, valor, pesos);
	return (
		<>
			<span aria-hidden="true" className="boleto-precio">
				<span className="boleto-etiqueta">Desde</span>
				<span className="precio-cuenta" ref={numero}>
					{pesos(valor)}
				</span>
			</span>
			<span className="oculto">Desde {pesos(valor)}</span>
		</>
	);
}
