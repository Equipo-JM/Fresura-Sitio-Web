import { describe, expect, it } from "vitest";
import {
	crearEsquemaGuion,
	esquemaInstruccionGuion,
	esquemaJsonGuion,
} from "../supabase/functions/_shared/esquemas/guion";
import { guionDePrueba } from "./datos/guion";

const instruccionValida = {
	producto_id: "arma-tu-fresota",
	campana: "Amor y amistad",
	objetivo: "promocion",
	tono: "Cercano e inspirador",
	red: "instagram",
	duracion_s: 15,
};

describe("instrucción del guion", () => {
	it("acepta una instrucción completa y una campaña nula", () => {
		expect(esquemaInstruccionGuion.safeParse(instruccionValida).success).toBe(
			true,
		);
		expect(
			esquemaInstruccionGuion.safeParse({ ...instruccionValida, campana: null })
				.success,
		).toBe(true);
	});

	it("PU-10: rechaza un campo adicional", () => {
		const conExtra = { ...instruccionValida, telefono: "3001234567" };
		expect(esquemaInstruccionGuion.safeParse(conExtra).success).toBe(false);
	});

	it.each([
		["campaña de más de 120 caracteres", { campana: "a".repeat(121) }],
		["tono vacío", { tono: "  " }],
		["objetivo desconocido", { objetivo: "vender" }],
		["red desconocida", { red: "x" }],
		["duración no admitida", { duracion_s: 20 }],
	])("rechaza %s", (_caso, cambio) => {
		expect(
			esquemaInstruccionGuion.safeParse({ ...instruccionValida, ...cambio })
				.success,
		).toBe(false);
	});
});

describe("guion", () => {
	const esquema15 = crearEsquemaGuion(15);

	it("acepta escenas contiguas que cubren la duración", () => {
		expect(esquema15.safeParse(guionDePrueba()).success).toBe(true);
	});

	it("PU-09: rechaza escenas no contiguas", () => {
		const guion = guionDePrueba();
		guion.escenas[1].inicio_s = 4;
		expect(esquema15.safeParse(guion).success).toBe(false);
	});

	it("rechaza que la primera escena no empiece en 0", () => {
		const guion = guionDePrueba();
		guion.escenas[0].inicio_s = 1;
		expect(esquema15.safeParse(guion).success).toBe(false);
	});

	it("rechaza una escena que termina antes de empezar", () => {
		const guion = guionDePrueba();
		guion.escenas[1].fin_s = 3;
		guion.escenas[2].inicio_s = 3;
		expect(esquema15.safeParse(guion).success).toBe(false);
	});

	it("rechaza que la última escena no termine en la duración", () => {
		expect(crearEsquemaGuion(30).safeParse(guionDePrueba()).success).toBe(
			false,
		);
	});

	it("PU-09: rechaza un guion sin un campo obligatorio", () => {
		const { gancho: _gancho, ...sinGancho } = guionDePrueba();
		expect(esquema15.safeParse(sinGancho).success).toBe(false);
	});

	it("el esquema JSON para Gemini no lleva $schema y exige todos los campos", () => {
		const esquema = esquemaJsonGuion();
		expect(esquema).not.toHaveProperty("$schema");
		expect(esquema.required).toEqual([
			"titulo",
			"gancho",
			"escenas",
			"llamado_accion",
			"texto_publicacion",
			"musica_sugerida",
			"notas_produccion",
		]);
	});
});
