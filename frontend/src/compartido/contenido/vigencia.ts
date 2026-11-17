import type { Contenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";

type Promocion = Contenido["promociones"][number];

/** Fecha de hoy en Colombia (AAAA-MM-DD), con la que se decide si una promoción está vigente. */
export function fechaColombia(ahora: Date = new Date()): string {
	// en-CA da el formato AAAA-MM-DD.
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/Bogota",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(ahora);
}

/** Promociones vigentes en `hoy`, con los días de inicio y fin incluidos. */
export function promocionesVigentes<T extends Pick<Promocion, "vigencia">>(
	promociones: readonly T[],
	hoy: string = fechaColombia(),
): T[] {
	return promociones.filter(
		(p) => p.vigencia.desde <= hoy && hoy <= p.vigencia.hasta,
	);
}
