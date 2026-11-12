import { useState } from "react";
import type { Contenido } from "../../../supabase/functions/_shared/esquemas/contenido";
import { vaciarCarrito } from "../../compartido/carrito/almacenCarrito";
import {
	type DatosEntrega,
	direccionCompleta,
	type Entrega,
	mensajePedido,
	nombreCompleto,
	totalCarrito,
} from "../../compartido/carrito/reglas";
import { useCarrito } from "../../compartido/carrito/useCarrito";
import { Icono } from "../../compartido/componentes/Icono";
import { MarcaPorValidar } from "../MarcaPorValidar";

/**
 * Paso 3: revisión y envío. El mensaje se arma con lo que eligió la persona y
 * se abre en WhatsApp; el pago se acuerda allí.
 */
export function PasoRevision({
	contenido,
	entrega,
	datos,
	onEditar,
}: {
	contenido: Contenido;
	entrega: Entrega;
	datos: DatosEntrega;
	onEditar: () => void;
}) {
	const { lineas } = useCarrito();
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
	});
	const numero = contenido.negocio.whatsapp;
	const enlace = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;

	if (enviado) {
		return (
			<div className="exito">
				<div className="sello-hoja" aria-hidden="true">
					¡Pedido listo!
				</div>
				<h1 id="titulo-paso" tabIndex={-1}>
					Abrimos WhatsApp con tu pedido
				</h1>
				<p>
					Envía el mensaje y te confirmamos el total, el domicilio y el pago.{" "}
					<MarcaPorValidar />
				</p>
				<button
					type="button"
					className="boton"
					onClick={() => {
						vaciarCarrito();
					}}
				>
					Empezar otro pedido
				</button>
			</div>
		);
	}

	return (
		<>
			<h1 id="titulo-paso" tabIndex={-1}>
				Revisa y <em>envía</em>
			</h1>
			<div className="revision">
				<div className="dato">
					<h2>Contacto</h2>
					<p>{datos.correo}</p>
					<p>{datos.telefono}</p>
					<button type="button" className="boton-texto" onClick={onEditar}>
						Cambiar contacto
					</button>
				</div>
				<div className="dato">
					<h2>{entrega === "domicilio" ? "Enviar a" : "Recoge"}</h2>
					<p>{nombreCompleto(datos)}</p>
					{entrega === "domicilio" ? (
						<>
							{datos.empresa.trim() && <p>{datos.empresa.trim()}</p>}
							<p>{direccionCompleta(datos)}</p>
							<p>
								{datos.barrio.trim()}, {datos.ciudad.trim()}
							</p>
						</>
					) : (
						<p>Sede U Nacional, Calle 45 # 28-10</p>
					)}
					<button type="button" className="boton-texto" onClick={onEditar}>
						Cambiar entrega
					</button>
				</div>
			</div>
			<section
				className="chat"
				aria-label="Vista previa del mensaje de WhatsApp"
			>
				<div className="chat-cabeza oscuro">
					<img className="chat-avatar" src="/marca/simbolo-color.svg" alt="" />
					<div>
						<p className="negrita">Fresura</p>
						<span className="pv">Número por definir</span>
					</div>
				</div>
				<div className="chat-cuerpo">
					<div className="burbuja">{texto}</div>
				</div>
			</section>
			<p className="chico">
				Tus datos van solo en el mensaje que envías por WhatsApp, para atender
				tu pedido. Este sitio no los guarda.{" "}
				<a className="enlace-texto" href="/privacidad">
					Política de datos
				</a>
			</p>
			<div className="acciones-fila">
				<a
					className="boton"
					href={enlace}
					target="_blank"
					rel="noopener noreferrer"
					onClick={() => setEnviado(true)}
				>
					<Icono nombre="chat" />
					Enviar pedido por WhatsApp
				</a>
				<button type="button" className="boton secundario" onClick={onEditar}>
					Volver a la entrega
				</button>
			</div>
		</>
	);
}
