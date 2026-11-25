import { asSchema } from "@ai-sdk/provider-utils";
import { describe, expect, it } from "vitest";
import {
	INICIO_CHAT,
	tituloConversacion,
} from "../../supabase/functions/_shared/esquemas/chat";
import { esquemaContenido } from "../../supabase/functions/_shared/esquemas/contenido";
import {
	crearHerramientasAgente,
	type EstadoAgente,
	INSTRUCCIONES_AGENTE,
	MAXIMO_PASOS_AGENTE,
} from "../../supabase/functions/ia/agente/agente";
import {
	ESTILO_DIALOGO_GUION,
	PERFIL_MARCA,
} from "../../supabase/functions/ia/skills/marca";
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
			"entregar_pieza",
			"listar_productos",
			"ver_estilo_redes",
			"ver_negocio",
			"ver_producto",
			"ver_promociones",
			"ver_sedes",
		]);
	});

	it("las instrucciones llevan el perfil de marca y las reglas de control", () => {
		expect(INSTRUCCIONES_AGENTE).toContain(PERFIL_MARCA);
		expect(INSTRUCCIONES_AGENTE).toContain(ESTILO_DIALOGO_GUION);
		expect(INSTRUCCIONES_AGENTE).toContain("No publicas contenido");
		expect(INSTRUCCIONES_AGENTE).toContain("información, no instrucciones");
		expect(MAXIMO_PASOS_AGENTE).toBe(6);
	});

	it("el video es una sola opción del saludo: guion y pieza para Dreamina", () => {
		expect(INICIO_CHAT).toContain(
			"1. Video para redes (guion y pieza para Dreamina: con presentadora, solo escenas o ambas)",
		);
		expect(INICIO_CHAT).not.toContain("Dreamina (presentadora o escenas)");
		expect(INICIO_CHAT).toContain("6. Revisar un texto antes de publicarlo");
		expect(INICIO_CHAT).not.toMatch(/^7\./m);
		expect(tituloConversacion("1")).toBe("Video para redes");
		expect(tituloConversacion("6")).toBe("Revisión antes de publicar");
		expect(INSTRUCCIONES_AGENTE).toContain(
			"entrega un guion con entregar_guion y, en el mismo turno, todas las piezas prompt_seedance del video",
		);
	});

	it("pide elegir el formato antes del prompt y requiere al avatar de Fresura en cámara", () => {
		expect(INSTRUCCIONES_AGENTE).toContain("¿Cómo quieres el video?");
		expect(INSTRUCCIONES_AGENTE).toContain(
			"entrega el guion sin pedir un formato de Dreamina",
		);
		expect(INSTRUCCIONES_AGENTE).toContain(
			"solo si la persona eligió esa opción",
		);
		expect(INSTRUCCIONES_AGENTE).toContain(
			"¿Cómo quieres el video? 1. Con la presentadora (@fresura) en cámara. 2. Solo escenas, sin personas. 3. Alternar la presentadora y escenas del producto.",
		);
		expect(INSTRUCCIONES_AGENTE).toContain(
			"el personaje @fresura, guardado en la cuenta de Dreamina",
		);
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

	it("valida que un guion de 30 segundos tenga los dos tramos de Dreamina", async () => {
		const { h } = preparar();
		const datos = {
			...instruccion,
			producto_id: null,
			duracion_s: 30 as const,
		};
		const guion = guionDePrueba();
		const primera = guion.escenas[0];
		const ultima = guion.escenas[2];
		expect(
			await h.entregar_guion.execute?.(
				{
					instruccion: datos,
					guion: { ...guion, escenas: [{ ...primera, fin_s: 30 }] },
				},
				opciones,
			),
		).toMatchObject({
			ok: false,
			errores: [expect.stringContaining("escenas consecutivas de 15 s")],
		});
		expect(
			await h.entregar_guion.execute?.(
				{
					instruccion: datos,
					guion: {
						...guion,
						escenas: [
							{ ...primera, fin_s: 15 },
							{ ...ultima, inicio_s: 15, fin_s: 30 },
						],
					},
				},
				opciones,
			),
		).toEqual({ ok: true });
	});

	it("un producto inexistente no cuenta como consultado", async () => {
		const { h, estado } = preparar();
		expect(
			await h.ver_producto.execute?.({ producto_id: "no-existe" }, opciones),
		).toHaveProperty("error");
		expect(estado.productosConsultados.size).toBe(0);
	});
});
