const MESES = [
	"enero",
	"febrero",
	"marzo",
	"abril",
	"mayo",
	"junio",
	"julio",
	"agosto",
	"septiembre",
	"octubre",
	"noviembre",
	"diciembre",
];

/** Palabras con las que suele seguir el título después de la oferta. */
const CONECTORES = ["en", "para", "con", "por", "los", "las", "al"];

/** Máximo de palabras que puede tener la oferta para mostrarse en grande. */
const PALABRAS_OFERTA = 3;

function partes(fecha: string): { anio: number; mes: number; dia: number } {
	const [anio, mes, dia] = fecha.split("-").map(Number);
	return { anio, mes, dia };
}

/**
 * Vigencia en palabras para el cupón: «Del 20 al 30 de noviembre», «Del 15 de
 * noviembre al 15 de diciembre» o «Solo el 20 de noviembre». El año solo
 * aparece cuando la promoción cruza de un año a otro.
 */
export function fechasLegibles(desde: string, hasta: string): string {
	const a = partes(desde);
	const b = partes(hasta);
	if (desde === hasta) return `Solo el ${b.dia} de ${MESES[b.mes - 1]}`;
	if (a.anio !== b.anio)
		return `Del ${a.dia} de ${MESES[a.mes - 1]} de ${a.anio} al ${b.dia} de ${MESES[b.mes - 1]} de ${b.anio}`;
	if (a.mes !== b.mes)
		return `Del ${a.dia} de ${MESES[a.mes - 1]} al ${b.dia} de ${MESES[b.mes - 1]}`;
	return `Del ${a.dia} al ${b.dia} de ${MESES[b.mes - 1]}`;
}

/** Días entre `hoy` y el último día de la promoción (0 si termina hoy). */
export function diasRestantes(hasta: string, hoy: string): number {
	const milisegundosDia = 86_400_000;
	return Math.round(
		(Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) /
			milisegundosDia,
	);
}

/**
 * Aviso del cupón según los días que quedan. Con tres días o menos se marca
 * como urgente para que el aviso llame la atención.
 */
export function avisoDias(dias: number): { texto: string; urgente: boolean } {
	if (dias <= 0) return { texto: "¡Último día!", urgente: true };
	if (dias === 1) return { texto: "¡Termina mañana!", urgente: true };
	if (dias <= 3) return { texto: `¡Últimos ${dias} días!`, urgente: true };
	return { texto: `Quedan ${dias} días`, urgente: false };
}

/**
 * Separa la oferta del resto del título para mostrarla en grande: «2x1 en
 * fresas con crema» → «2x1» y «en fresas con crema». Corta en el primer
 * conector si la oferta queda de pocas palabras; si no, el título va entero
 * como oferta y `resto` queda vacío.
 */
export function separarTitulo(titulo: string): {
	oferta: string;
	resto: string;
} {
	const palabras = titulo.trim().split(/\s+/);
	const corte = palabras.findIndex(
		(palabra, i) => i > 0 && CONECTORES.includes(palabra.toLowerCase()),
	);
	if (corte === -1 || corte > PALABRAS_OFERTA)
		return { oferta: palabras.join(" "), resto: "" };
	return {
		oferta: palabras.slice(0, corte).join(" "),
		resto: palabras.slice(corte).join(" "),
	};
}
