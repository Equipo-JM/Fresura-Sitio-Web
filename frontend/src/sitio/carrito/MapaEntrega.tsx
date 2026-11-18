import type { Contenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";
import type { Entrega } from "../../compartido/carrito/reglas";
import { MapaSede } from "../MapaSede";

/**
 * Mapa bajo el resumen del pedido. Con domicilio (o sin elegir) muestra la zona
 * aproximada de cobertura alrededor de la sede que atiende pedidos; al recoger,
 * acerca el mapa a esa sede. El texto dice lo mismo que el dibujo.
 */
export function MapaEntrega({
	contenido,
	entrega,
}: {
	contenido: Contenido;
	entrega: Entrega;
}) {
	const sede = contenido.negocio.sedes.find((s) => s.atiende_pedidos);
	if (!sede) return null;
	const recoger = entrega === "recoger";
	const radio = sede.radio_domicilio_km;
	const nombreCorto = sede.nombre.replace(/^Sede /, "sede ");
	return (
		<figure className="mapa-entrega">
			<MapaSede
				nombre={sede.nombre}
				ubicacion={sede.ubicacion}
				// Con zoom 12 entran los 5 km de cobertura en el ancho de la columna.
				zoom={recoger ? 16 : 12}
				radioKm={recoger ? null : radio}
			/>
			<figcaption>
				{recoger ? (
					<>
						<strong>Recoges en la {nombreCorto}</strong> {sede.direccion},
						Bogotá
					</>
				) : (
					<>
						<strong>Zona de domicilios</strong>{" "}
						{radio
							? `Hasta ${radio} km en línea recta desde la ${nombreCorto} (zona aproximada).`
							: `Desde la ${nombreCorto}.`}
					</>
				)}
			</figcaption>
		</figure>
	);
}
