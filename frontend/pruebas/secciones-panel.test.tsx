import type { SupabaseClient } from "@supabase/supabase-js";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { SeccionesPanel } from "../src/panel/SeccionesPanel";
import type { Database } from "../src/tipos/database.types";

// Cada sección tiene sus propias pruebas; aquí solo importa cómo se navega entre ellas.
vi.mock("../src/panel/versiones/VersionesPanel", () => ({
	VersionesPanel: () => <h1>Pantalla de versiones</h1>,
}));
vi.mock("../src/panel/contenido/ContenidoPanel", () => ({
	ContenidoPanel: ({
		onPendiente,
	}: {
		onPendiente: (pendiente: boolean) => void;
	}) => (
		<>
			<h1>Pantalla de contenido</h1>
			<button type="button" onClick={() => onPendiente(true)}>
				Escribir algo
			</button>
		</>
	),
}));
vi.mock("../src/panel/guiones/GuionesPanel", () => ({
	GuionesPanel: ({ irVersiones }: { irVersiones: () => void }) => (
		<>
			<h1>Pantalla de guiones</h1>
			<button type="button" onClick={irVersiones}>
				Volver a versiones
			</button>
		</>
	),
}));

function abrirPanel() {
	render(
		<MemoryRouter>
			<SeccionesPanel cliente={{} as SupabaseClient<Database>} />
		</MemoryRouter>,
	);
}

describe("menú del panel", () => {
	it("empieza en Versiones y ofrece Contenido y Agente", () => {
		abrirPanel();
		expect(screen.getByRole("heading", { name: "Pantalla de versiones" }));
		expect(screen.getByRole("button", { name: "Contenido" }));
		expect(screen.getByRole("button", { name: "Agente" }));
	});

	it("abre Agente a pantalla completa y vuelve a Versiones con su propio botón", () => {
		abrirPanel();
		fireEvent.click(screen.getByRole("button", { name: "Agente" }));
		expect(screen.getByRole("heading", { name: "Pantalla de guiones" }));
		expect(screen.queryByRole("navigation", { name: "Menú del panel" })).toBe(
			null,
		);
		fireEvent.click(screen.getByRole("button", { name: "Volver a versiones" }));
		expect(screen.getByRole("heading", { name: "Pantalla de versiones" }));
	});

	it("pregunta antes de salir de Contenido con cambios sin guardar", () => {
		const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
		abrirPanel();
		fireEvent.click(screen.getByRole("button", { name: "Contenido" }));
		fireEvent.click(screen.getByRole("button", { name: "Escribir algo" }));
		fireEvent.click(screen.getByRole("button", { name: "Agente" }));
		expect(confirmar).toHaveBeenCalled();
		expect(screen.getByRole("heading", { name: "Pantalla de contenido" }));
		confirmar.mockRestore();
	});
});
