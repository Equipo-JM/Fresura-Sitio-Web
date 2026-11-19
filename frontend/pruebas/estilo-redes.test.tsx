import { createClient } from "@supabase/supabase-js";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EstiloRedesPanel } from "../src/panel/estilo/EstiloRedesPanel";
import type { Database } from "../src/tipos/database.types";

function montar() {
	const filas: Record<string, unknown>[] = [
		{
			id: "r1",
			red: "tiktok",
			formato: "video",
			enlace: null,
			texto: "¿Antojo bonito? 🍓",
			publicada_en: "2026-11-10",
		},
	];
	const cambios: { metodo: string; cuerpo?: unknown }[] = [];
	const fetchSimulado = vi.fn(
		async (entrada: RequestInfo | URL, opciones?: RequestInit) => {
			const metodo = opciones?.method ?? "GET";
			if (metodo === "POST") {
				const cuerpo = JSON.parse(String(opciones?.body));
				cambios.push({ metodo, cuerpo });
				filas.unshift({ id: "r2", ...cuerpo });
				return new Response(null, { status: 201 });
			}
			if (metodo === "DELETE") {
				cambios.push({ metodo });
				const id = new URL(String(entrada)).searchParams.get("id");
				filas.splice(
					filas.findIndex((f) => `eq.${f.id}` === id),
					1,
				);
				return new Response(null, { status: 204 });
			}
			return Response.json(filas);
		},
	);
	const cliente = createClient<Database>("https://supabase.invalid", "clave", {
		global: { fetch: fetchSimulado },
		auth: { persistSession: false, autoRefreshToken: false },
	});
	render(<EstiloRedesPanel cliente={cliente} />);
	return { cambios };
}

describe("referencias de estilo en el panel", () => {
	it("guarda una referencia válida, rechaza enlaces sin https y permite borrar", async () => {
		const { cambios } = montar();
		expect(await screen.findByText("¿Antojo bonito? 🍓")).toBeVisible();

		fireEvent.change(
			screen.getByLabelText("Enlace de la publicación (opcional)"),
			{
				target: { value: "http://instagram.com/p/1" },
			},
		);
		fireEvent.change(screen.getByLabelText("Texto o descripción"), {
			target: { value: "Carrusel de toppings" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Guardar referencia" }));
		expect(await screen.findByText(/debe empezar por https/)).toBeVisible();
		expect(cambios).toEqual([]);

		fireEvent.change(
			screen.getByLabelText("Enlace de la publicación (opcional)"),
			{
				target: { value: "https://www.instagram.com/p/1" },
			},
		);
		fireEvent.change(screen.getByLabelText("Formato"), {
			target: { value: "carrusel" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Guardar referencia" }));
		expect(
			await screen.findByText(
				"Referencia guardada. El agente ya la tiene en cuenta.",
			),
		).toBeVisible();
		expect(cambios[0].cuerpo).toEqual({
			red: "instagram",
			formato: "carrusel",
			enlace: "https://www.instagram.com/p/1",
			texto: "Carrusel de toppings",
			publicada_en: null,
		});
		expect(await screen.findByText("Carrusel de toppings")).toBeVisible();

		fireEvent.click(screen.getAllByRole("button", { name: "Borrar" })[0]);
		await waitFor(() =>
			expect(screen.queryByText("Carrusel de toppings")).toBeNull(),
		);
	});
});
