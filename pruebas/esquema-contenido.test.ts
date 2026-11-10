import { describe, expect, it } from "vitest";
import { esquemaContenido } from "../supabase/functions/_shared/esquemas/contenido";
import casos from "./datos/contenido-1.0.1.casos.json";
import ejemplo from "./datos/contenido-1.0.1.ejemplo.json";

type Caso = {
	caso: string;
	op: "poner" | "quitar";
	ruta: (string | number)[];
	valor?: unknown;
	regla?: string;
};

/** Copia el ejemplo y aplica el cambio del caso (`poner` un valor o `quitar` un campo). */
function aplicarCaso({ op, ruta, valor }: Caso): unknown {
	const copia: unknown = structuredClone(ejemplo);
	let nodo = copia as Record<string | number, unknown>;
	for (const paso of ruta.slice(0, -1)) {
		nodo = nodo[paso] as Record<string | number, unknown>;
	}
	const ultimo = ruta[ruta.length - 1];
	if (op === "quitar") {
		delete nodo[ultimo];
	} else {
		nodo[ultimo] = valor;
	}
	return copia;
}

describe("esquema del contrato de contenido 1.0.1", () => {
	it("acepta el ejemplo", () => {
		const resultado = esquemaContenido.safeParse(ejemplo);
		expect(resultado.error?.issues).toBeUndefined();
	});

	it("tiene los 32 casos de rechazo", () => {
		expect(casos).toHaveLength(32);
	});

	it.each(casos as Caso[])("rechaza: $caso", (caso) => {
		const resultado = esquemaContenido.safeParse(aplicarCaso(caso));
		expect(resultado.success).toBe(false);
		// Si el caso nombra una regla cruzada, el rechazo debe venir de ella.
		if (caso.regla) {
			const mensajes = resultado.error?.issues.map((i) => i.message) ?? [];
			expect(mensajes.some((m) => m.startsWith(caso.regla as string))).toBe(
				true,
			);
		}
	});
});
