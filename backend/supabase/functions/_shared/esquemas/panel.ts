import { z } from "zod";

/** Exige la revisión que vio la persona y su decisión de aprobación (DD-26). */
export const esquemaPublicar = z.strictObject({
	revision: z.int().min(1),
	contenido_real: z.boolean(),
});

/** Restaurar no admite campos para evitar decisiones implícitas del cliente. */
export const esquemaRestaurar = z.strictObject({});
