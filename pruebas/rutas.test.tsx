import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { RutasDelSitio } from "../src/RutasDelSitio";

function mostrarRuta(ruta: string) {
	render(
		<MemoryRouter initialEntries={[ruta]}>
			<RutasDelSitio />
		</MemoryRouter>,
	);
}

describe("rutas del sitio", () => {
	it("muestra el aviso breve en /privacidad y dice que la política está en revisión", () => {
		mostrarRuta("/privacidad");
		expect(
			screen.getByRole("heading", { level: 1, name: /tratamiento de datos/i }),
		).toBeInTheDocument();
		expect(screen.getByText(/está en revisión/i)).toBeInTheDocument();
		expect(screen.getByText(/este sitio no los guarda/i)).toBeInTheDocument();
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
