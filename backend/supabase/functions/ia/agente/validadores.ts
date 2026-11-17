import type { Contenido } from "../../_shared/esquemas/contenido.ts";
import type { Guion } from "../../_shared/esquemas/guion.ts";

/**
 * Comprobaciones en código del agente conversacional (DT-01, 25.6): la salida
 * estructurada no garantiza que el modelo use solo los datos publicados, así
 * que los precios y el producto se comparan con lo que entregaron las herramientas.
 */

// Un precio es un número con «$» delante, o seguido de «mil», «k», «lucas», «pesos» o «COP».
// Así no se confunden tamaños (13 oz), horas (12:00) ni direcciones (# 28-10).
const PRECIO =
	/\$\s?(\d{1,3}(?:[.,]\d{3})+|\d+)|(\d+)\s*(?:mil|k|lucas)\b(?:\s*pesos)?|(\d{1,3}(?:[.,]\d{3})+|\d+)\s*(?:pesos|cop)\b/gi;

/** Precios en pesos que aparecen en un texto, en el orden en que aparecen. */
export function extraerPrecios(texto: string): number[] {
	return [...texto.matchAll(PRECIO)].map(([, conSigno, miles, conPalabra]) =>
		miles !== undefined
			? Number(miles) * 1000
			: Number((conSigno ?? conPalabra).replace(/[.,]/g, "")),
	);
}

type Producto = Contenido["productos"][number];

/** Precios de un producto: sus presentaciones y adicionales, sin nulos ni ceros. */
export function preciosDelProducto(producto: Producto): Set<number> {
	const precios = new Set<number>();
	for (const presentacion of producto.presentaciones) {
		if (presentacion.precio) precios.add(presentacion.precio);
	}
	for (const grupo of producto.grupos_opciones) {
		for (const opcion of grupo.opciones) {
			if (opcion.adicional) precios.add(opcion.adicional);
		}
	}
	return precios;
}

/** Precios de todos los productos vigentes; con ellos se revisa el texto del chat. */
export function preciosPublicados(contenido: Contenido): Set<number> {
	return new Set(
		contenido.productos
			.filter((p) => p.vigente)
			.flatMap((p) => [...preciosDelProducto(p)]),
	);
}

/** Revisa precios y, si se pasan sedes, nombres propios explícitos tras «sede». No interpreta referencias indirectas a lugares. */
export function validarTextoContraDatos(
	texto: string,
	precios: ReadonlySet<number>,
	sedes?: readonly string[],
): string[] {
	const erroresSedes = sedes
		? [
				...texto.matchAll(
					/\b[Ss]ede\s+(?:(?:de|en|del)\s+)?[«“"]?([\p{Lu}][\p{L}\p{N}-]*(?:\s+[\p{Lu}][\p{L}\p{N}-]*)*)/gu,
				),
			]
				.filter(
					([, nombre]) =>
						!sedes.some(
							(sede) =>
								normalizar(sede).replace(/^sede\s+/, "") === normalizar(nombre),
						),
				)
				.map(() => "La sede mencionada no está publicada.")
		: [];
	return [
		...erroresSedes,
		...extraerPrecios(texto)
			.filter((precio) => !precios.has(precio))
			.map(
				(precio) =>
					`El precio $${precio.toLocaleString("es-CO")} no está publicado; usa solo los precios de las herramientas.`,
			),
	];
}

/** Valida el guion entregado: que nombre el producto y que sus precios estén publicados. */
export function validarGuionContraDatos(
	guion: Guion,
	nombreProducto: string,
	precios: ReadonlySet<number>,
): string[] {
	const texto = [
		guion.titulo,
		guion.gancho,
		...guion.escenas.flatMap((e) => [e.que_se_ve, e.texto_pantalla, e.voz]),
		guion.llamado_accion,
		guion.texto_publicacion,
		guion.notas_produccion,
	].join("\n");
	const errores = validarTextoContraDatos(texto, precios);
	if (!nombraPalabra(normalizar(texto), normalizar(nombreProducto))) {
		errores.unshift(`El guion no nombra el producto «${nombreProducto}».`);
	}
	return errores;
}

// Palabra completa: «Pan» no cuenta dentro de «pantalla».
function nombraPalabra(texto: string, nombre: string): boolean {
	const escapado = nombre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(
		`(^|[^\\p{L}\\p{N}])${escapado}($|[^\\p{L}\\p{N}])`,
		"u",
	).test(texto);
}

function normalizar(texto: string): string {
	return texto
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();
}
