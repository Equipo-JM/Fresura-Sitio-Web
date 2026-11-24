const tituloClip = /^(?:clip|tramo)\s+\d+\b/i;
const etiquetaPrompt =
	/^prompt(?:\s+(?:para\s+)?(?:Dreamina|Seedance)(?:\s+[\d.]+)?)?\s*:?$/i;
const inicioAvatar = /^@fresura\s+es la presentadora\b/i;
const duracion = /^duraci[oó]n del clip\s*:\s*\d+\s*(?:s\b|segundos?\b)/i;
const continuidad = /^El clip se siente natural de principio a fin\b/i;
const instrucciones = /^c[oó]mo usar\b/i;

type Fragmento = { inicio: number; texto: string; esPrompt: boolean };

/** Reconoce entregas antiguas en texto sin incluir las instrucciones de uso en la copia. */
export function separarPromptsDreamina(texto: string): Fragmento[] {
	const partes: Fragmento[] = [];
	const mencionaHerramienta = /\b(?:Dreamina|Seedance)\b/i.test(texto);
	let bloque: string[] = [];
	let inicio = 0;
	let esPrompt = false;
	let tieneAvatar = false;
	let tieneDuracion = false;

	function cerrar() {
		const contenido = bloque.join("\n").trim();
		if (contenido) partes.push({ inicio, texto: contenido, esPrompt });
		bloque = [];
		tieneAvatar = false;
		tieneDuracion = false;
	}

	for (const [indice, linea] of texto.split(/\r?\n/).entries()) {
		const marca = linea
			.trim()
			.replace(/^[#>*\s]+|\*+$/g, "")
			.trim();
		const avatar = inicioAvatar.test(marca);
		const tiempo = duracion.test(marca);
		const delimitadorCodigo = /^`{3}/.test(marca);
		if (delimitadorCodigo && esPrompt) {
			if (bloque.some((l) => l.trim())) {
				cerrar();
				esPrompt = false;
			}
			continue;
		}
		const etiqueta = etiquetaPrompt.test(marca) && mencionaHerramienta;
		if (
			tituloClip.test(marca) ||
			instrucciones.test(marca) ||
			/^¿(?:quieres que|te gustar[ií]a que|te paso|continuamos con|seguimos con)\b/i.test(marca)
		) {
			cerrar();
			esPrompt = false;
		}
		if (
			etiqueta ||
			avatar ||
			((tiempo || continuidad.test(marca)) && mencionaHerramienta)
		) {
			if (
				!esPrompt ||
				etiqueta ||
				(avatar && tieneAvatar) ||
				(tiempo && tieneDuracion)
			)
				cerrar();
			esPrompt = true;
			tieneAvatar ||= avatar;
			tieneDuracion ||= tiempo;
			if (etiqueta) continue;
		}
		if (!bloque.length) inicio = indice;
		bloque.push(linea);
	}
	cerrar();
	return partes.some((p) => p.esPrompt)
		? partes
		: [{ inicio: 0, texto, esPrompt: false }];
}
