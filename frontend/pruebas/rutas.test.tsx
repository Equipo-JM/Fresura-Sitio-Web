import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import ejemplo from "../../backend/pruebas/datos/contenido-1.0.1.ejemplo.json";
import { RutasDelSitio } from "../src/RutasDelSitio";

function mostrarRuta(ruta: string) {
	const cliente = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<QueryClientProvider client={cliente}>
			<MemoryRouter initialEntries={[ruta]}>
				<RutasDelSitio />
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe("rutas del sitio", () => {
	it("muestra el aviso breve en /privacidad y dice que la política está en revisión", () => {
		mostrarRuta("/privacidad");
		expect(
			screen.getByRole("heading", { level: 1, name: /política de datos/i }),
		).toBeInTheDocument();
		expect(screen.getByText(/está en revisión/i)).toBeInTheDocument();
		expect(screen.getByText(/este sitio no los guarda/i)).toBeInTheDocument();
	});

	it("muestra en el inicio la presentación leída del contenido", async () => {
		// La versión publicada llega como la fila `{ json }` de Supabase.
		const publicado = structuredClone(ejemplo);
		publicado.negocio.presentacion.titulo = "Un titular editado desde el panel";
		vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
			Response.json({ json: publicado }),
		);
		mostrarRuta("/");
		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: publicado.negocio.presentacion.titulo,
			}),
		).toBeInTheDocument();
		expect(screen.queryByText("Por validar")).toBeNull();
		vi.restoreAllMocks();
	});

	it("enlaza la política de datos desde el inicio", () => {
		mostrarRuta("/");
		expect(
			screen.getByRole("link", { name: /política de datos/i }),
		).toHaveAttribute("href", "/privacidad");
	});

	it("muestra la página de no encontrada en rutas desconocidas", () => {
		mostrarRuta("/no-existe");
		expect(
			screen.getByRole("heading", { name: /no encontramos/i }),
		).toBeInTheDocument();
	});
});
