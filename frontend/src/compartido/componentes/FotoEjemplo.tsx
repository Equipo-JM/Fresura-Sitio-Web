// Ancho de la variante pequeña que acompaña a cada foto de ejemplo en `frontend/public/ejemplos/`.
const ANCHO_VARIANTE = 400;

/**
 * Foto de referencia del kit de marca, puesta solo para el prototipo. Lleva la
 * etiqueta «Por validar» porque no consta que Fresura tenga sus derechos
 * (kit de diseño, «Fotografía»): se reemplaza antes de publicar.
 *
 * Si la foto mide más de 400 px de ancho, junto a ella existe una variante
 * `<nombre>-400.webp` y el navegador elige la que necesita según `tamanos`
 * (RNF-04: tamaño por pantalla).
 */
export function FotoEjemplo({
	src,
	alt,
	ancho,
	alto,
	tamanos = "(min-width: 900px) 33vw, 90vw",
	prioridad = false,
	marcada = true,
}: {
	src: string;
	alt: string;
	ancho: number;
	alto: number;
	/** Ancho que ocupa la foto en pantalla, en el formato de `sizes`. */
	tamanos?: string;
	/** La de la portada se pide de inmediato; el resto, al acercarse. */
	prioridad?: boolean;
	/** Permite que el marco exterior coloque una única etiqueta sobre el arco. */
	marcada?: boolean;
}) {
	const conVariante = ancho > ANCHO_VARIANTE;
	return (
		<>
			<img
				src={src}
				srcSet={
					conVariante
						? `${src.replace(/\.webp$/, `-${ANCHO_VARIANTE}.webp`)} ${ANCHO_VARIANTE}w, ${src} ${ancho}w`
						: undefined
				}
				sizes={conVariante ? tamanos : undefined}
				alt={alt}
				width={ancho}
				height={alto}
				loading={prioridad ? "eager" : "lazy"}
				fetchPriority={prioridad ? "high" : undefined}
				decoding="async"
			/>
			{marcada && (
				<span className="pv pv-foto foto-ejemplo-marca">Por validar</span>
			)}
		</>
	);
}
