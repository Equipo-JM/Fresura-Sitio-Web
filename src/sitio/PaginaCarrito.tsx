import { useState } from "react";
import type { Contenido } from "../../supabase/functions/_shared/esquemas/contenido";
import { vaciarCarrito } from "../compartido/carrito/almacenCarrito";
import {
	claveLinea,
	DATOS_VACIOS,
	type DatosEntrega,
	type Entrega,
	pesos,
	totalCarrito,
	validarDatos,
} from "../compartido/carrito/reglas";
import { useCarrito } from "../compartido/carrito/useCarrito";
import { Icono } from "../compartido/componentes/Icono";
import { AvisoRespaldo } from "./AvisoRespaldo";
import { ConContenido } from "./ConContenido";
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
					<section className="pagina">
						<div className="envoltura texto-largo">
							<h1>Carrito</h1>
							<AvisoRespaldo whatsapp={contenido.negocio.whatsapp} />
						</div>
					</section>
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
	const { total, pendiente } = totalCarrito(lineas, contenido.productos);

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
	}

	function revisar() {
		const nuevos = validarDatos(datos, entrega);
		setErrores(nuevos);
		if (Object.keys(nuevos).length === 0) setPaso(3);
	}

	return (
		<section className="pagina">
			<div className="envoltura">
				<nav className="pasos-nav" aria-label="Pasos del pedido">
					<ol className="pasos">
						{NOMBRES_PASOS.map((nombre, i) => {
							const numero = (i + 1) as 1 | 2 | 3;
							const actual = paso === numero;
							const hecho = paso > numero;
							return (
								<li
									className={`paso${actual ? " actual" : hecho ? " hecho" : ""}`}
									key={nombre}
									aria-current={actual ? "step" : undefined}
								>
									{hecho ? (
										<button
											type="button"
											className="paso-num"
											onClick={() => setPaso(numero)}
											aria-label={`Volver a ${nombre}`}
										>
											<Icono nombre="ok" />
										</button>
									) : (
										<span className="paso-num" aria-hidden="true">
											{numero}
										</span>
									)}
									<span className="paso-texto">{nombre}</span>
								</li>
							);
						})}
					</ol>
				</nav>

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
										return (
											<div className="item" key={claveLinea(linea)}>
												<span>
													{producto?.nombre ?? "Producto"} × {linea.cantidad}
												</span>
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
										El total no incluye domicilio. El total, el domicilio y el
										pago se confirman por WhatsApp.
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
								/>
							)}
						</div>
					</div>
				)}
			</div>
		</section>
	);
}
