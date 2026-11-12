/**
 * Foto de referencia del kit de marca, puesta solo para el prototipo. Lleva la
 * etiqueta «Foto de ejemplo» porque no consta que Fresura tenga sus derechos
 * (kit de diseño, «Fotografía»): se reemplaza antes de publicar.
 */
export function FotoEjemplo({
	src,
	alt,
	ancho,
	alto,
	prioridad = false,
}: {
	src: string;
	alt: string;
	ancho: number;
	alto: number;
	/** La de la portada se pide de inmediato; el resto, al acercarse. */
	prioridad?: boolean;
}) {
	return (
		<>
			<img
				src={src}
				alt={alt}
				width={ancho}
				height={alto}
				loading={prioridad ? "eager" : "lazy"}
				decoding="async"
			/>
			<span className="por-validar foto-ejemplo-marca">Foto de ejemplo</span>
		</>
	);
}
