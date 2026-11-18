import { useRef } from "react";
import { useCalcomaniaViva } from "../compartido/movimiento/useCalcomaniaViva";
import {
	CALCOMANIAS,
	type NombreCalcomania,
	rutaCalcomania,
} from "./calcomanias";

type Props = { nombre: NombreCalcomania; className?: string };

/**
 * Ilustración decorativa con proporciones originales, oculta a tecnologías de
 * asistencia. Cae al entrar en pantalla y se puede arrastrar con el puntero.
 */
export function Calcomania({ nombre, className }: Props) {
	const [width, height] = CALCOMANIAS[nombre];
	const imagen = useRef<HTMLImageElement>(null);
	useCalcomaniaViva(imagen);
	return (
		<img
			ref={imagen}
			src={rutaCalcomania(nombre)}
			alt=""
			aria-hidden="true"
			width={width}
			height={height}
			loading="lazy"
			decoding="async"
			draggable={false}
			className={`calcomania${className ? ` ${className}` : ""}`}
		/>
	);
}
