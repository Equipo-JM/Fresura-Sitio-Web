import { type Coordenadas, radioEnPixeles, urlMapaInsertado } from "./mapa";

/**
 * Mapa de Google Maps centrado en una sede. Con `radioKm` dibuja encima la zona
 * aproximada de domicilios; el círculo es decorativo y la zona se explica en
 * texto junto al mapa.
 */
export function MapaSede({
	nombre,
	ubicacion,
	zoom = 16,
	radioKm,
}: {
	nombre: string;
	ubicacion: Coordenadas;
	zoom?: number;
	radioKm?: number | null;
}) {
	const radio = radioKm ? radioEnPixeles(radioKm, ubicacion.lat, zoom) : 0;
	return (
		<div className="mapa-sede">
			<iframe
				src={urlMapaInsertado(ubicacion, zoom)}
				title={`Mapa de la ${nombre}`}
				loading="lazy"
				referrerPolicy="no-referrer-when-downgrade"
			/>
			{radio > 0 && (
				<span
					className="mapa-radio"
					aria-hidden="true"
					style={{ width: radio * 2, height: radio * 2 }}
				/>
			)}
		</div>
	);
}
