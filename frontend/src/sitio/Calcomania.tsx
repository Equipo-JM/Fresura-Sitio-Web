const dimensiones = {
	"fresitas-fresotas-fresuras": [480, 364],
	"dulce-pero-con-estilo-gafas": [480, 416],
	"las-mejores-fresas-de-bogota": [466, 480],
	"ven-date-un-gusto-bonito": [384, 480],
	"fresas-con-crema-chocolate-y-flow": [446, 480],
} as const;

type Props = { nombre: keyof typeof dimensiones; className?: string };

/** Ilustración decorativa con proporciones originales, oculta a tecnologías de asistencia. */
export function Calcomania({ nombre, className }: Props) {
	const [width, height] = dimensiones[nombre];
	return (
		<img
			src={`/calcomanias/${nombre}.webp`}
			alt=""
			aria-hidden="true"
			width={width}
			height={height}
			loading="lazy"
			decoding="async"
			className={`calcomania${className ? ` ${className}` : ""}`}
		/>
	);
}
