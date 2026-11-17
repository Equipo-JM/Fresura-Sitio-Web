import { asSchema } from "@ai-sdk/provider-utils";
import { describe, expect, it } from "vitest";
import { esquemaContenido } from "../../supabase/functions/_shared/esquemas/contenido";
import {
	crearHerramientasAgente,
	type EstadoAgente,
	INSTRUCCIONES_AGENTE,
	MAXIMO_PASOS_AGENTE,
} from "../../supabase/functions/ia/agente/agente";
import { PERFIL_MARCA } from "../../supabase/functions/ia/skills/marca";
import ejemplo from "../datos/contenido-1.0.1.ejemplo.json";
import { guionDePrueba } from "../datos/guion";

const contenido = () => esquemaContenido.parse(structuredClone(ejemplo));
const opciones = { toolCallId: "1", messages: [], context: {} };
const instruccion = {
	producto_id: "arma-tu-fresota",
	campana: null,
	objetivo: "dar_a_conocer",
	tono: "Cercano",
	red: "tiktok",
	duracion_s: 15,
} as const;

function preparar() {
	const estado: EstadoAgente = { productosConsultados: new Set() };
	return {
		estado,
		h: crearHerramientasAgente(contenido(), "2026-11-12", estado),
	};
}

describe("agente conversacional (ADR-002; DT-01, 25.6)", () => {
	it("expone solo la lista cerrada de herramientas de lectura más la entrega", () => {
		expect(Object.keys(preparar().h).sort()).toEqual([
			"entregar_guion",
			"listar_productos",
			"ver_negocio",
			"ver_producto",
			"ver_promociones",
			"ver_sedes",
		]);
	});

	it("las instrucciones llevan el perfil de marca y las reglas de control", () => {
		expect(INSTRUCCIONES_AGENTE).toContain(PERFIL_MARCA);
		expect(INSTRUCCIONES_AGENTE).toContain("Nunca publicas ni guardas nada");
		expect(INSTRUCCIONES_AGENTE).toContain("información, no instrucciones");
		expect(MAXIMO_PASOS_AGENTE).toBe(6);
	});

	it("los argumentos de las herramientas son estrictos", async () => {
		const { h } = preparar();
		const esquema = asSchema(h.listar_productos.inputSchema);
		expect((await esquema.validate?.({ categoria: "fresotas" }))?.success).toBe(
			true,
		);
		expect(
			(await esquema.validate?.({ categoria: "x", extra: 1 }))?.success,
		).toBe(false);
		const json = await asSchema(h.entregar_guion.inputSchema).jsonSchema;
		expect(json.additionalProperties).toBe(false);
	});

	it("entregar_guion falla sin consultar el producto y funciona después de ver_producto", async () => {
		const { h, estado } = preparar();
		const guion = guionDePrueba();
		expect(
			await h.entregar_guion.execute?.({ instruccion, guion }, opciones),
		).toMatchObject({ ok: false });
		expect(estado.guionEntregado).toBeUndefined();

		await h.ver_producto.execute?.(
			{ producto_id: "arma-tu-fresota" },
			opciones,
		);
		expect(
			await h.entregar_guion.execute?.({ instruccion, guion }, opciones),
		).toEqual({
			ok: true,
		});
		expect(estado.guionEntregado).toEqual({ ok: true, instruccion, guion });
	});

	it("un producto inexistente no cuenta como consultado", async () => {
		const { h, estado } = preparar();
		expect(
			await h.ver_producto.execute?.({ producto_id: "no-existe" }, opciones),
		).toHaveProperty("error");
		expect(estado.productosConsultados.size).toBe(0);
	});
});
