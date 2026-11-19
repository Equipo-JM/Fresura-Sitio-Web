import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Pieza } from "../../backend/supabase/functions/_shared/esquemas/pieza";
import {
	convertirHistorial,
	leerPiezas,
} from "../src/panel/agente/servicioConversaciones";
import { TarjetaPieza } from "../src/panel/agente/TarjetaPieza";

const pieza: Pieza = {
	tipo: "prompt_imagen",
	titulo: "Fotos de Arma tu Fresita",
	red: "instagram",
	bloques: [
		{ etiqueta: "Prompt", texto: "Usa la foto adjunta del vaso, formato 4:5." },
		{ etiqueta: "Variante", texto: "Misma foto con fondo rosa claro." },
		{ etiqueta: "Cómo usar", texto: "Abre Gemini y adjunta la foto real." },
	],
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("piezas de contenido en el chat", () => {
	it("recupera de la memoria solo las piezas entregadas con éxito", () => {
		const llamada = (id: string, entrada: unknown) => ({
			role: "assistant",
			content: [
				{
					type: "tool-call",
					toolCallId: id,
					toolName: "entregar_pieza",
					input: entrada,
				},
			],
		});
		const resultado = (id: string, ok: boolean) => ({
			role: "tool",
			content: [
				{
					type: "tool-result",
					toolCallId: id,
					toolName: "entregar_pieza",
					output: { type: "json", value: ok ? { ok } : { ok, errores: [] } },
				},
			],
		});
		const mensajes = convertirHistorial([
			{ id: "a", contenido: llamada("rechazada", pieza) },
			{ id: "b", contenido: resultado("rechazada", false) },
			{ id: "c", contenido: llamada("valida", pieza) },
			{ id: "d", contenido: resultado("valida", true) },
		]);
		expect(mensajes).toHaveLength(1);
		expect(mensajes[0].metadata?.piezas).toEqual([pieza]);
		expect(leerPiezas([pieza, { tipo: "otro" }])).toEqual([pieza]);
	});

	it("copia solo los prompts y abre la herramienta en otra pestaña", async () => {
		const escribir = vi.fn(async () => {});
		vi.stubGlobal("navigator", { clipboard: { writeText: escribir } });
		render(<TarjetaPieza pieza={pieza} />);
		expect(screen.getByText("Prompt de foto · Instagram")).toBeVisible();
		const enlace = screen.getByRole("link", {
			name: /Copiar y abrir Gemini/,
		});
		expect(enlace).toHaveAttribute("href", "https://gemini.google.com/app");
		expect(enlace).toHaveAttribute("target", "_blank");
		fireEvent.click(enlace);
		expect(escribir).toHaveBeenCalledWith(
			"Prompt\nUsa la foto adjunta del vaso, formato 4:5.\n\nVariante\nMisma foto con fondo rosa claro.",
		);
		expect(
			await screen.findByText("Prompt copiado. Pégalo en Gemini."),
		).toBeVisible();
	});

	it("una publicación se copia completa y no abre ninguna herramienta", async () => {
		const escribir = vi.fn(async () => {});
		vi.stubGlobal("navigator", { clipboard: { writeText: escribir } });
		render(
			<TarjetaPieza
				pieza={{
					tipo: "publicacion",
					titulo: "Antojo de jueves",
					red: "instagram",
					bloques: [
						{ etiqueta: "Texto", texto: "¿Ya tienes antojo?" },
						{ etiqueta: "Hashtags", texto: "#Fresura" },
					],
				}}
			/>,
		);
		expect(screen.queryByRole("link")).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Copiar texto" }));
		expect(escribir).toHaveBeenCalledWith(
			"Antojo de jueves\n\nTexto\n¿Ya tienes antojo?\n\nHashtags\n#Fresura",
		);
		expect(await screen.findByText("Texto copiado.")).toBeVisible();
	});
});
