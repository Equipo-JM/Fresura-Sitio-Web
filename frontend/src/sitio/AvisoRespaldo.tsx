import { Icono } from "../compartido/componentes/Icono";

/**
 * Aviso del modo respaldo (DD-14): sin la fuente principal no hay precios
 * confiables, así que el carrito se desactiva y se ofrece WhatsApp directo.
 */
export function AvisoRespaldo({
	whatsapp,
	mensaje = "Hola, Fresura. Quiero hacer un pedido.",
}: {
	whatsapp: string;
	mensaje?: string;
}) {
	return (
		<div className="alerta" role="status">
			<Icono nombre="alerta" />
			<div>
				<p>
					<strong>Consulta precios por WhatsApp.</strong> En este momento no
					podemos mostrar precios ni recibir pedidos desde el carrito.
				</p>
				<a
					className="boton"
					href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`}
					target="_blank"
					rel="noopener noreferrer"
				>
					<Icono nombre="chat" />
					Pedir por WhatsApp
				</a>
			</div>
		</div>
	);
}
