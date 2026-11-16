import type { SupabaseClient } from "@supabase/supabase-js";

const nombreFoto = /^[0-9a-f]{64}\.(webp|jpg)$/;
const unDia = 24 * 60 * 60 * 1000;

/**
 * Recorre cada `imagen.ruta` y cuenta como en uso todo archivo cuyo nombre sea
 * un hash de foto, sin mirar el dominio ni la carpeta.
 */
export function extraerFotosEnUso(contenido: unknown): Set<string> {
	const fotos = new Set<string>();
	function recorrer(nodo: unknown): void {
		if (typeof nodo !== "object" || nodo === null) return;
		if (Array.isArray(nodo)) {
			for (const elemento of nodo) recorrer(elemento);
			return;
		}
		if ("imagen" in nodo && typeof nodo.imagen === "object" && nodo.imagen) {
			if ("ruta" in nodo.imagen && typeof nodo.imagen.ruta === "string") {
				// Conservador a propósito: si el dominio público de Storage no coincide con
				// SUPABASE_URL (dominio propio, entorno local), comparar orígenes haría que
				// todas las fotos parecieran sin uso y se borrarían.
				const sinConsulta = nodo.imagen.ruta.split(/[?#]/)[0];
				const ultimo = sinConsulta.slice(sinConsulta.lastIndexOf("/") + 1);
				try {
					const nombre = decodeURIComponent(ultimo);
					if (nombreFoto.test(nombre)) fotos.add(nombre);
				} catch {
					// Un nombre mal codificado no es una foto del bucket.
				}
			}
		}
		for (const valor of Object.values(nodo)) recorrer(valor);
	}
	recorrer(contenido);
	return fotos;
}

/** Solo permite borrar archivos por hash sin referencias y con más de 24 horas. */
export function decidirFotosParaBorrar(
	objetos: readonly { name: string; created_at?: string | null }[],
	enUso: ReadonlySet<string>,
	ahora: number,
): string[] {
	return objetos
		.filter(
			(objeto) =>
				nombreFoto.test(objeto.name) &&
				!enUso.has(objeto.name) &&
				typeof objeto.created_at === "string" &&
				Date.parse(objeto.created_at) < ahora - unDia,
		)
		.map((objeto) => objeto.name);
}

/** Limpia con service_role después de publicar; el llamador aísla los fallos. */
export async function limpiarFotos(
	cliente: SupabaseClient,
	ahora = Date.now(),
): Promise<void> {
	const { data: versiones, error } = await cliente
		.from("versiones_contenido")
		.select("json")
		.in("estado", ["publicada", "anterior", "borrador"]);
	if (error || !versiones) throw new Error("lectura_versiones");
	const bucket = cliente.storage.from("fotos");
	const enUso = extraerFotosEnUso(versiones.map((version) => version.json));
	const candidatos: { name: string; created_at?: string | null }[] = [];
	const limite = 100;
	for (let offset = 0; ; offset += limite) {
		const { data, error: errorListado } = await bucket.list("", {
			limit: limite,
			offset,
			sortBy: { column: "name", order: "asc" },
		});
		if (errorListado || !data) throw new Error("listado_fotos");
		candidatos.push(...data);
		if (data.length < limite) break;
	}
	// Se termina de listar antes de borrar para no alterar los offsets pendientes.
	const paraBorrar = decidirFotosParaBorrar(candidatos, enUso, ahora);
	for (let inicio = 0; inicio < paraBorrar.length; inicio += limite) {
		const { error: errorBorrado } = await bucket.remove(
			paraBorrar.slice(inicio, inicio + limite),
		);
		if (errorBorrado) throw new Error("borrado_fotos");
	}
}
