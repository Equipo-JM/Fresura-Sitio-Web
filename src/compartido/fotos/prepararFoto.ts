/** Límite del bucket `fotos` (DD-18): la demostración aplica el mismo. */
export const MAX_BYTES_FOTO = 300 * 1024;
/** Lado mayor de la foto ya preparada: alcanza para la ficha en pantallas grandes. */
export const LADO_MAXIMO = 1200;

const TIPOS_ACEPTADOS = ["image/jpeg", "image/png", "image/webp"];

/**
 * Mensaje para la persona si el archivo no sirve como foto, o `null` si sirve.
 * Se comprueba antes de procesarlo para dar un aviso claro (RNF-14).
 */
export function problemaArchivo(archivo: {
	type: string;
	size: number;
}): string | null {
	if (!TIPOS_ACEPTADOS.includes(archivo.type)) {
		return "Elige una foto en formato JPG, PNG o WebP.";
	}
	if (archivo.size > 15 * 1024 * 1024) {
		return "La foto es demasiado pesada. Elige una de menos de 15 MB.";
	}
	return null;
}

/** Tamaño final conservando la proporción, sin pasar de `LADO_MAXIMO`. */
export function medidasReducidas(
	ancho: number,
	alto: number,
): { ancho: number; alto: number } {
	const escala = Math.min(1, LADO_MAXIMO / Math.max(ancho, alto));
	return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) };
}

function aBlob(
	lienzo: HTMLCanvasElement,
	tipo: string,
	calidad: number,
): Promise<Blob | null> {
	return new Promise((resolver) => lienzo.toBlob(resolver, tipo, calidad));
}

/**
 * Reduce la foto y la convierte a WebP (JPEG si el navegador no codifica WebP,
 * como puede pasar en Safari), bajando la calidad hasta quedar en 300 KB.
 * Es lo mismo que hará el panel real antes de subirla (DD-18).
 *
 * @throws con un mensaje para la persona si la foto no se puede preparar.
 */
export async function prepararFoto(archivo: File): Promise<Blob> {
	const problema = problemaArchivo(archivo);
	if (problema) throw new Error(problema);

	let imagen: ImageBitmap;
	try {
		imagen = await createImageBitmap(archivo);
	} catch {
		throw new Error("No pudimos abrir esa foto. Prueba con otra.");
	}
	const { ancho, alto } = medidasReducidas(imagen.width, imagen.height);
	const lienzo = document.createElement("canvas");
	lienzo.width = ancho;
	lienzo.height = alto;
	lienzo.getContext("2d")?.drawImage(imagen, 0, 0, ancho, alto);
	imagen.close();

	for (const calidad of [0.82, 0.72, 0.6, 0.5]) {
		let foto = await aBlob(lienzo, "image/webp", calidad);
		if (!foto || foto.type !== "image/webp") {
			foto = await aBlob(lienzo, "image/jpeg", calidad);
		}
		if (foto && foto.size <= MAX_BYTES_FOTO) return foto;
	}
	throw new Error(
		"No logramos dejar la foto por debajo de 300 KB. Prueba con otra.",
	);
}
