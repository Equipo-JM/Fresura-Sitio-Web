import { useState } from "react";
import { distanciaKm } from "../carrito/reglas";

/** Resultado de comprobar la cobertura de domicilio. */
export type EstadoCobertura =
	| "sin-comprobar"
	| "buscando"
	| "dentro"
	| "fuera"
	| "sin-permiso";

/**
 * Comprueba si la persona está dentro del radio de la sede que atiende pedidos.
 * La ubicación se usa solo para esta comprobación: no se envía ni se guarda.
 */
export function useCobertura(
	sede: { lat: number; lng: number },
	radioKm: number,
) {
	const [estado, setEstado] = useState<EstadoCobertura>("sin-comprobar");

	function comprobar() {
		if (!navigator.geolocation) {
			setEstado("sin-permiso");
			return;
		}
		setEstado("buscando");
		navigator.geolocation.getCurrentPosition(
			(posicion) => {
				const punto = {
					lat: posicion.coords.latitude,
					lng: posicion.coords.longitude,
				};
				setEstado(distanciaKm(sede, punto) <= radioKm ? "dentro" : "fuera");
			},
			() => setEstado("sin-permiso"),
			{ enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
		);
	}

	return { estado, comprobar };
}
