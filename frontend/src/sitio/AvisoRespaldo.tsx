import { Icono } from "../compartido/componentes/Icono";

/**
 * Aviso del modo respaldo (DD-14): sin la fuente principal no hay precios
 * confiables, así que el carrito se desactiva y se ofrece WhatsApp directo.
 */
export function AvisoRespaldo({
	whatsapp,
	mensaje = "Hola, Fresura. Quiero consultar los precios.",
}: {
	whatsapp: string;
	mensaje?: string;
}) {
	return (
		<div className="aviso-global" role="status">
			<div className="envoltura">
				<p className="negrita">Consulta precios por WhatsApp</p>
				<a
					className="boton compacto"
					href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`}
					target="_blank"
					rel="noopener noreferrer"
				>
					<Icono nombre="chat" />
					Escríbenos
				</a>
			</div>
		</div>
	);
}
