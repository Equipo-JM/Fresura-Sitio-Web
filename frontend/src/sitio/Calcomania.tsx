import { useRef } from "react";
import { useCalcomaniaViva } from "../compartido/movimiento/useCalcomaniaViva";

const dimensiones = {
	"fresitas-fresotas-fresuras": [480, 364],
	"dulce-pero-con-estilo-gafas": [480, 416],
	"las-mejores-fresas-de-bogota": [466, 480],
	"ven-date-un-gusto-bonito": [384, 480],
	"fresas-con-crema-chocolate-y-flow": [446, 480],
} as const;

type Props = { nombre: keyof typeof dimensiones; className?: string };

/**
 * Ilustración decorativa con proporciones originales, oculta a tecnologías de
 * asistencia. Cae al entrar en pantalla y se puede arrastrar con el puntero.
 */
export function Calcomania({ nombre, className }: Props) {
	const [width, height] = dimensiones[nombre];
	const imagen = useRef<HTMLImageElement>(null);
	useCalcomaniaViva(imagen);
	return (
		<img
			ref={imagen}
			src={`/calcomanias/${nombre}.webp`}
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
