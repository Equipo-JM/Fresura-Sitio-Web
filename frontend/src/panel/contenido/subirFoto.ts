import type { SupabaseClient } from "@supabase/supabase-js";
import type { Contenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";
import {
	prepararFoto,
	problemaArchivo,
} from "../../compartido/fotos/prepararFoto";
import type { Database } from "../../tipos/database.types";

const NO_ADMITIDA =
	"Usa una foto JPG, PNG o WebP. La reducimos por ti; si no alcanza, prueba con otra.";

async function medirFoto(blob: Blob) {
	const direccion = URL.createObjectURL(blob);
	try {
		const imagen = new Image();
		imagen.src = direccion;
		await imagen.decode();
		return { ancho: imagen.naturalWidth, alto: imagen.naturalHeight };
	} finally {
		URL.revokeObjectURL(direccion);
	}
}

/** Prepara y sube una foto inmutable; un duplicado conserva la misma dirección. */
export async function subirFoto(
	cliente: SupabaseClient<Database>,
	archivo: File,
	alt: string,
	dependencias = { preparar: prepararFoto, medir: medirFoto },
): Promise<Contenido["productos"][number]["imagen"]> {
	if (problemaArchivo(archivo)) throw new Error(NO_ADMITIDA);
	let foto: Blob;
	let medidas: { ancho: number; alto: number };
	try {
		foto = await dependencias.preparar(archivo);
		if (
			!["image/webp", "image/jpeg"].includes(foto.type) ||
			foto.size > 300 * 1024
		)
			throw new Error(NO_ADMITIDA);
		medidas = await dependencias.medir(foto);
	} catch {
		throw new Error(NO_ADMITIDA);
	}
	try {
		const resumen = await crypto.subtle.digest(
			"SHA-256",
			await foto.arrayBuffer(),
		);
		const hash = Array.from(new Uint8Array(resumen), (byte) =>
			byte.toString(16).padStart(2, "0"),
		).join("");
		const nombre = `${hash}.${foto.type === "image/webp" ? "webp" : "jpg"}`;
		const bucket = cliente.storage.from("fotos");
		const { error } = await bucket.upload(nombre, foto, {
			upsert: false,
			contentType: foto.type,
		});
		if (
			error &&
			!(
				"statusCode" in error &&
				(String(error.statusCode) === "409" ||
					(String(error.statusCode) === "400" &&
						error.message === "The resource already exists"))
			)
		)
			throw error;
		return {
			ruta: bucket.getPublicUrl(nombre).data.publicUrl,
			alt,
			...medidas,
		};
	} catch {
		throw new Error("No pudimos subir la foto. Inténtalo de nuevo.");
	}
}
