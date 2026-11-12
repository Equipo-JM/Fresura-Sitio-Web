/**
 * Fotos del panel de demostración, guardadas en IndexedDB de este navegador.
 * Sirven para enseñar cómo el administrador cambia las fotos mientras no
 * exista el panel real (etapa 3), que las subirá al bucket `fotos` de Supabase
 * y las publicará con vista previa. Nada de esto sale del navegador.
 */

const BASE = "fresura-panel-demo";
const ALMACEN = "fotos";

/** Clave de la foto de portada; las de producto son `producto:<id>`. */
export const CLAVE_PORTADA = "portada";

/** Clave de la foto de un producto. */
export function claveProducto(idProducto: string): string {
	return `producto:${idProducto}`;
}

/** Foto lista para mostrarse: dirección local (`blob:`) y su descripción. */
export type FotoDemo = { url: string; alt: string };

type Registro = { clave: string; foto: Blob; alt: string };

let fotos: Record<string, FotoDemo> = {};
const suscriptores = new Set<() => void>();

function disponible(): boolean {
	return (
		typeof indexedDB !== "undefined" &&
		typeof URL.createObjectURL === "function"
	);
}

function abrir(): Promise<IDBDatabase> {
	return new Promise((resolver, rechazar) => {
		const solicitud = indexedDB.open(BASE, 1);
		solicitud.onupgradeneeded = () => {
			solicitud.result.createObjectStore(ALMACEN, { keyPath: "clave" });
		};
		solicitud.onsuccess = () => resolver(solicitud.result);
		solicitud.onerror = () => rechazar(solicitud.error);
	});
}

async function transaccion<T>(
	modo: IDBTransactionMode,
	operar: (almacen: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
	const base = await abrir();
	try {
		return await new Promise<T>((resolver, rechazar) => {
			const solicitud = operar(
				base.transaction(ALMACEN, modo).objectStore(ALMACEN),
			);
			solicitud.onsuccess = () => resolver(solicitud.result);
			solicitud.onerror = () => rechazar(solicitud.error);
		});
	} finally {
		base.close();
	}
}

function publicar(nuevas: Record<string, FotoDemo>) {
	// Las direcciones `blob:` ocupan memoria hasta que se liberan.
	for (const [clave, foto] of Object.entries(fotos)) {
		if (nuevas[clave]?.url !== foto.url) URL.revokeObjectURL(foto.url);
	}
	fotos = nuevas;
	for (const avisar of suscriptores) avisar();
}

async function recargar() {
	const registros = await transaccion<Registro[]>("readonly", (a) =>
		a.getAll(),
	);
	const nuevas: Record<string, FotoDemo> = {};
	for (const r of registros) {
		nuevas[r.clave] = { url: URL.createObjectURL(r.foto), alt: r.alt };
	}
	publicar(nuevas);
}

/** Suscribe a los cambios. Devuelve la función para cancelar. */
export function suscribirFotosDemo(avisar: () => void): () => void {
	suscriptores.add(avisar);
	return () => suscriptores.delete(avisar);
}

/** Fotos actuales. Misma referencia hasta que cambian. */
export function leerFotosDemo(): Record<string, FotoDemo> {
	return fotos;
}

/** Guarda (o reemplaza) una foto y avisa a las pantallas. */
export async function guardarFotoDemo(clave: string, foto: Blob, alt: string) {
	if (!disponible())
		throw new Error("Este navegador no permite guardar fotos.");
	await transaccion("readwrite", (a) =>
		a.put({ clave, foto, alt } satisfies Registro),
	);
	await recargar();
}

/** Cambia solo la descripción de una foto ya guardada. */
export async function describirFotoDemo(clave: string, alt: string) {
	const registro = await transaccion<Registro | undefined>("readonly", (a) =>
		a.get(clave),
	);
	if (!registro) return;
	await transaccion("readwrite", (a) => a.put({ ...registro, alt }));
	fotos = { ...fotos, [clave]: { ...fotos[clave], alt } };
	for (const avisar of suscriptores) avisar();
}

/** Quita una foto: el sitio vuelve a mostrar la de antes. */
export async function quitarFotoDemo(clave: string) {
	await transaccion("readwrite", (a) => a.delete(clave));
	await recargar();
}

/** Borra todas las fotos de la demostración. */
export async function borrarFotosDemo() {
	await transaccion("readwrite", (a) => a.clear());
	await recargar();
}

// Al cargar el sitio se leen las fotos ya guardadas en este navegador.
if (disponible()) {
	recargar().catch((error: unknown) => {
		console.warn("No se pudieron leer las fotos de la demostración", { error });
	});
}
