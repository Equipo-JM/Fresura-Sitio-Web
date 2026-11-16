import { Icono } from "../compartido/componentes/Icono";

/** Conserva el carrito guardado y ofrece atención directa mientras se usa el respaldo. */
export function CompraDesactivada({ whatsapp }: { whatsapp: string }) {
	return (
		<section className="pagina">
			<div className="envoltura">
				<div className="vacio">
					<img src="/marca/fresa-porcini.svg" alt="" width="88" height="125" />
					<h1>
						El carrito no está disponible <em>por ahora</em>
					</h1>
					<p className="negrita">Consulta precios por WhatsApp</p>
					<a
						className="boton"
						href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Hola, Fresura. Quiero consultar los precios.")}`}
						target="_blank"
						rel="noopener noreferrer"
					>
						<Icono nombre="chat" />
						Escríbenos
					</a>
				</div>
			</div>
		</section>
	);
}
