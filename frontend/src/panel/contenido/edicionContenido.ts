import {
	type Contenido,
	esquemaContenido,
} from "../../../../backend/supabase/functions/_shared/esquemas/contenido";

/** Genera nombres internos únicos sin cambiar los que ya usa el sitio. */
export function completarIdentificadores(contenido: Contenido): Contenido {
	const copia = structuredClone(contenido);
	function completar<T extends { id: string }>(
		lista: T[],
		nombre: (elemento: T) => string,
	) {
		const ocupados = new Set(lista.filter((e) => e.id).map((e) => e.id));
		for (const elemento of lista) {
			if (elemento.id || !nombre(elemento).trim()) continue;
			const base =
				nombre(elemento)
					.normalize("NFD")
					.replace(/[\u0300-\u036f]/g, "")
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, "-")
					.replace(/^-|-$/g, "")
					.slice(0, 70)
					.replace(/-$/, "") || "nuevo";
			let id = base;
			let numero = 2;
			while (ocupados.has(id)) id = `${base}-${numero++}`;
			elemento.id = id;
			ocupados.add(id);
		}
	}
	completar(copia.categorias, (e) => e.nombre);
	completar(copia.negocio.sedes, (e) => e.nombre);
	completar(copia.productos, (e) => e.nombre);
	completar(copia.promociones, (e) => e.titulo);
	completar(copia.preguntas_frecuentes, (e) => e.pregunta);
	for (const producto of copia.productos) {
		completar(producto.presentaciones, (e) => e.nombre);
		completar(producto.grupos_opciones, (e) => e.nombre);
		for (const grupo of producto.grupos_opciones)
			completar(grupo.opciones, (e) => e.nombre);
	}
	return copia;
}

/** Traduce todos los rechazos del contrato a mensajes asociados al campo del formulario. */
export function erroresContenido(contenido: Contenido): Record<string, string> {
	const resultado = esquemaContenido.safeParse(contenido);
	if (resultado.success) return {};
	const errores: Record<string, string> = {};
	for (const problema of resultado.error.issues) {
		let ruta = problema.path.join(".");
		if (ruta.endsWith(".id"))
			ruta = ruta.replace(
				/\.id$/,
				ruta.startsWith("promociones.")
					? ".titulo"
					: ruta.startsWith("preguntas_frecuentes.")
						? ".pregunta"
						: ".nombre",
			);
		let mensaje = "Revisa este campo: escribe un valor válido.";
		if (problema.code === "too_small")
			mensaje =
				"Escribe un valor; si es una lista, agrega al menos un elemento y revisa el mínimo permitido.";
		if (problema.code === "too_big")
			mensaje = `Reduce este valor. El máximo permitido es ${problema.maximum}.`;
		if (problema.code === "invalid_type")
			mensaje =
				"Escribe solo números válidos; para precios, pesos enteros sin puntos ni comas.";
		if (problema.code === "invalid_format")
			mensaje = ruta.endsWith("whatsapp")
				? "Escribe 57 seguido de los 10 números del celular."
				: "Revisa el formato; los enlaces deben comenzar por https:// y las fechas deben existir.";
		const reglas: Record<string, string> = {
			"RC-1":
				"Elige una sola sede para pedidos y completa su radio de domicilio. Las otras sedes no llevan radio.",
			"RC-2": "Este nombre se repite. Usa otro nombre para distinguirlo.",
			"RC-3": "Elige un producto de la lista.",
			"RC-4": "La fecha final debe ser igual o posterior a la inicial.",
			"RC-5": "Cuando se elige una sola opción, el máximo debe ser 1.",
			"RC-6": "El máximo no puede superar la cantidad de opciones disponibles.",
			"RC-7": "Elige una categoría de la lista.",
			"RC-8": "Elige una fecha que exista en el calendario.",
			"RF-12": "Completa este dato para mostrar las opiniones.",
		};
		for (const [regla, texto] of Object.entries(reglas))
			if (problema.message.startsWith(regla)) mensaje = texto;
		errores[ruta] = mensaje;
	}
	return errores;
}
