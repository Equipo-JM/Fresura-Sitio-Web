import { useState } from "react";
import type { Contenido } from "../../../backend/supabase/functions/_shared/esquemas/contenido";
import { vaciarCarrito } from "../compartido/carrito/almacenCarrito";
import {
	claveLinea,
	DATOS_VACIOS,
	type DatosEntrega,
	type Entrega,
	mensajePedido,
	nombreProducto,
	pesos,
	precioLinea,
	totalCarrito,
	validarDatos,
} from "../compartido/carrito/reglas";
import { useCarrito } from "../compartido/carrito/useCarrito";
import { Icono } from "../compartido/componentes/Icono";
import { CompraDesactivada } from "./CompraDesactivada";
import { ConContenido } from "./ConContenido";
import { MiniaturaProducto } from "./carrito/MiniaturaProducto";
import { PasoEntrega } from "./carrito/PasoEntrega";
import { PasoPedido } from "./carrito/PasoPedido";
import { PasoRevision } from "./carrito/PasoRevision";
import { useEnfocarPaso } from "./carrito/useEnfocarPaso";

const NOMBRES_PASOS = [
	"Tu pedido",
	"Entrega y datos",
	"Revisa y envía",
] as const;

/**
 * Carrito en tres pasos: tu pedido, entrega y datos, y revisión con el mensaje
 * de WhatsApp. El resumen se pliega en móvil y queda fijo al lado en escritorio.
 * En modo respaldo el carrito se desactiva y se ofrece WhatsApp (DD-14).
 */
export function PaginaCarrito() {
	return (
		<ConContenido>
			{(contenido, origen) =>
				origen === "respaldo" ? (
					<CompraDesactivada whatsapp={contenido.negocio.whatsapp} />
				) : (
					<Carrito contenido={contenido} />
				)
			}
		</ConContenido>
	);
}

function Carrito({ contenido }: { contenido: Contenido }) {
	const { lineas } = useCarrito();
	const [paso, setPaso] = useState<1 | 2 | 3>(1);
	const [entrega, setEntrega] = useState<Entrega>("");
	const [datos, setDatos] = useState<DatosEntrega>(DATOS_VACIOS);
	const [errores, setErrores] = useState<ReturnType<typeof validarDatos>>({});
	const [resumenAbierto, setResumenAbierto] = useState(false);
	const [enviado, setEnviado] = useState(false);
	const { total, pendiente } = totalCarrito(lineas, contenido.productos);
	const texto = mensajePedido({
		lineas,
		productos: contenido.productos,
		categorias: contenido.categorias,
		datos,
		entrega,
		total,
		pendiente,
		sede: contenido.negocio.sedes.find((s) => s.atiende_pedidos),
	});
	const enlace = `https://wa.me/${contenido.negocio.whatsapp}?text=${encodeURIComponent(texto)}`;

	// Si el carrito se vacía (se quitó lo último), los pasos 2 y 3 no tienen
	// sentido: se vuelve al paso 1, que muestra el carrito vacío.
	if (lineas.length === 0 && paso !== 1) setPaso(1);
	useEnfocarPaso(paso);

	function nuevoPedido() {
		vaciarCarrito();
		setPaso(1);
		setEntrega("");
		setDatos(DATOS_VACIOS);
		setErrores({});
		setEnviado(false);
	}

	function revisar() {
		const nuevos = validarDatos(datos, entrega);
		setErrores(nuevos);
		if (Object.keys(nuevos).length === 0) setPaso(3);
		else {
			const orden = [
				"correo",
				"entrega",
				"nombre",
				"apellidos",
				"direccion",
				"barrio",
				"ciudad",
				"telefono",
			] as const;
			const primero = orden.find((campo) => nuevos[campo]);
			document
				.getElementById(
					primero === "entrega" ? "entrega-domicilio" : `c-${primero}`,
				)
				?.focus();
		}
	}

	return (
		<section className={lineas.length === 0 ? "pagina" : undefined}>
			<div className="envoltura">
				{lineas.length > 0 && (
					<nav className="pasos-nav" aria-label="Pasos del pedido">
						{lineas.length > 0 && (
							<ol className="pasos">
								{NOMBRES_PASOS.map((nombre, i) => {
									const numero = (i + 1) as 1 | 2 | 3;
									const actual = paso === numero && !enviado;
									const hecho = paso > numero || enviado;
									return (
										<li
											className={`paso${actual ? " actual" : hecho ? " hecho" : ""}`}
											key={nombre}
											aria-current={actual ? "step" : undefined}
										>
											{hecho && !enviado ? (
												<button
													type="button"
													className="paso-num"
													onClick={() => setPaso(numero)}
													aria-label={`Volver a ${nombre}`}
												>
													<Icono nombre="visto" />
												</button>
											) : (
												<span className="paso-num" aria-hidden="true">
													{enviado ? <Icono nombre="visto" /> : numero}
												</span>
											)}
											<span className="paso-texto">{nombre}</span>
										</li>
									);
								})}
							</ol>
						)}
					</nav>
				)}

				{lineas.length === 0 && paso === 1 ? (
					<PasoPedido contenido={contenido} onContinuar={() => setPaso(2)} />
				) : (
					<div className="lienzo">
						<aside className="columna-resumen" aria-labelledby="titulo-resumen">
							<div className={`resumen${resumenAbierto ? " abierto" : ""}`}>
								<button
									type="button"
									className="resumen-boton"
									aria-expanded={resumenAbierto}
									aria-controls="resumen-cuerpo"
									onClick={() => setResumenAbierto((a) => !a)}
								>
									<span id="titulo-resumen">Resumen del pedido</span>
									<span className="resumen-total">
										{pesos(total)}
										<Icono nombre="abajo" />
									</span>
								</button>
								<div className="resumen-cuerpo" id="resumen-cuerpo">
									{lineas.map((linea) => {
										const producto = contenido.productos.find(
											(p) => p.id === linea.idProducto,
										);
										if (!producto) return null;
										const presentacion = producto.presentaciones.find(
											(p) => p.id === linea.idPresentacion,
										);
										const precio = precioLinea(producto, linea);
										return (
											<div className="item" key={claveLinea(linea)}>
												<MiniaturaProducto
													producto={producto}
													cantidad={linea.cantidad}
												/>
												<span>
													{nombreProducto(producto, contenido.categorias)}
													<br />
													<span className="chico">{presentacion?.nombre}</span>
												</span>
												<strong>
													{precio === null
														? "Precio por confirmar"
														: pesos(precio)}
												</strong>
											</div>
										);
									})}
									<div className="total">
										<span>Total estimado</span>
										<strong>{pesos(total)}</strong>
									</div>
									{pendiente && (
										<p className="chico negrita">
											Los productos sin precio publicado no se suman a este
											total.
										</p>
									)}
									<p className="chico">
										El total estimado no incluye promociones ni domicilio. El
										total, el domicilio y el pago se confirman por WhatsApp.
									</p>
								</div>
							</div>
						</aside>
						<div className="etapa">
							{paso === 1 && (
								<PasoPedido
									contenido={contenido}
									onContinuar={() => setPaso(2)}
								/>
							)}
							{paso === 2 && (
								<PasoEntrega
									contenido={contenido}
									entrega={entrega}
									datos={datos}
									errores={errores}
									onEntrega={(valor) => {
										setEntrega(valor);
										setErrores((e) => ({ ...e, entrega: undefined }));
									}}
									onDatos={(cambios) => setDatos((d) => ({ ...d, ...cambios }))}
									onRevisar={revisar}
									onVolver={() => setPaso(1)}
								/>
							)}
							{paso === 3 && (
								<PasoRevision
									contenido={contenido}
									entrega={entrega}
									datos={datos}
									onEditar={() => setPaso(2)}
									onNuevoPedido={nuevoPedido}
									texto={texto}
									enlace={enlace}
									enviado={enviado}
									onEnviar={() => setEnviado(true)}
								/>
							)}
						</div>
					</div>
				)}
			</div>
			{lineas.length > 0 && !enviado && (
				<div className="compra-barra oscuro carrito-barra">
					<div className="envoltura">
						<div className="barra-texto">
							<span className="chico">Total estimado</span>
							<strong className="precio-barra">{pesos(total)}</strong>
						</div>
						{paso === 1 ? (
							<button
								type="button"
								className="boton"
								onClick={() => setPaso(2)}
							>
								Continuar
							</button>
						) : paso === 2 ? (
							<button type="submit" className="boton" form="form-carrito">
								Revisar pedido
							</button>
						) : (
							<a
								className="boton"
								href={enlace}
								target="_blank"
								rel="noopener noreferrer"
								onClick={() => setEnviado(true)}
							>
								Enviar por WhatsApp
							</a>
						)}
					</div>
				</div>
			)}
		</section>
	);
}
