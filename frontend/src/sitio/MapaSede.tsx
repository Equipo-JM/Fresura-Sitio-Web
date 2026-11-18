import { useRef } from "react";
import { type Coordenadas, radioEnPixeles, urlMapaInsertado } from "./mapa";
import { useMapaVivo } from "./useMapaVivo";

/**
 * Mapa de Google Maps centrado en una sede. Con `radioKm` dibuja encima la zona
 * aproximada de domicilios; el círculo es decorativo y la zona se explica en
 * texto junto al mapa. Con `marcadorFresa` cambia el pin de Google por la fresa
 * de la marca, que cae al entrar en pantalla mientras la zona se expande.
 */
export function MapaSede({
	nombre,
	ubicacion,
	zoom = 16,
	radioKm,
	marcadorFresa = false,
}: {
	nombre: string;
	ubicacion: Coordenadas;
	zoom?: number;
	radioKm?: number | null;
	marcadorFresa?: boolean;
}) {
	const radio = radioKm ? radioEnPixeles(radioKm, ubicacion.lat, zoom) : 0;
	const mapa = useRef<HTMLDivElement>(null);
	useMapaVivo(mapa, marcadorFresa);
	return (
		<div
			className={marcadorFresa ? "mapa-sede con-fresa" : "mapa-sede"}
			ref={mapa}
		>
			<iframe
				src={urlMapaInsertado(ubicacion, zoom, !marcadorFresa)}
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
			{marcadorFresa && (
				<img
					className="mapa-fresa"
					src="/marca/fresa-flamingo.svg"
					alt=""
					aria-hidden="true"
					width="40"
					height="57"
				/>
			)}
		</div>
	);
}
