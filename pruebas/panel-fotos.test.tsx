import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import prueba from "../public/contenido-prueba.json";
import { claveProducto } from "../src/compartido/fotos/almacenFotosDemo";
import { aplicarFotosDemo } from "../src/compartido/fotos/aplicarFotosDemo";
import {
	LADO_MAXIMO,
	medidasReducidas,
	problemaArchivo,
} from "../src/compartido/fotos/prepararFoto";
import { RutasDelSitio } from "../src/RutasDelSitio";
import { esquemaContenido } from "../supabase/functions/_shared/esquemas/contenido";

const contenido = esquemaContenido.parse(prueba);

describe("fotos del panel de demostración", () => {
	it("reemplaza solo la foto del producto cambiado", () => {
		const [primero, segundo] = contenido.productos;
		const resultado = aplicarFotosDemo(contenido, {
			[claveProducto(primero.id)]: {
				url: "blob:foto-nueva",
				alt: "Foto nueva",
			},
		});
		expect(resultado.productos[0].imagen).toMatchObject({
			ruta: "blob:foto-nueva",
			alt: "Foto nueva",
		});
		expect(resultado.productos[1]).toBe(segundo);
	});

	it("sin fotos cambiadas devuelve el mismo contenido", () => {
		expect(aplicarFotosDemo(contenido, {})).toBe(contenido);
	});

	it("acepta JPG, PNG y WebP y rechaza otros archivos", () => {
		expect(problemaArchivo({ type: "image/jpeg", size: 1000 })).toBeNull();
		expect(problemaArchivo({ type: "image/webp", size: 1000 })).toBeNull();
		expect(problemaArchivo({ type: "text/plain", size: 10 })).toMatch(
			/JPG, PNG o WebP/,
		);
		expect(
			problemaArchivo({ type: "image/png", size: 20 * 1024 * 1024 }),
		).toMatch(/pesada/);
	});

	it("reduce la foto a su lado máximo sin deformarla", () => {
		expect(medidasReducidas(4000, 3000)).toEqual({
			ancho: LADO_MAXIMO,
			alto: 900,
		});
		expect(medidasReducidas(800, 600)).toEqual({ ancho: 800, alto: 600 });
	});
});

describe("ruta /admin", () => {
	it("pide entrar y, tras los dos pasos, muestra la sección de fotos", () => {
		sessionStorage.clear();
		const cliente = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		render(
			<QueryClientProvider client={cliente}>
				<MemoryRouter initialEntries={["/admin"]}>
					<RutasDelSitio />
				</MemoryRouter>
			</QueryClientProvider>,
		);

		expect(screen.getByText("Modo demostración")).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText("Correo"), {
			target: { value: "demo@fresura.co" },
		});
		fireEvent.change(screen.getByLabelText("Contraseña"), {
			target: { value: "demostracion" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
		// Sin la verificación antibots no deja seguir.
		expect(screen.getByRole("alert")).toHaveTextContent(/antibots/i);
		fireEvent.click(screen.getByRole("checkbox"));
		fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

		fireEvent.change(screen.getByLabelText("Código de 6 dígitos"), {
			target: { value: "123456" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Verificar" }));

		expect(
			screen.getByRole("heading", { level: 1, name: "Fotos" }),
		).toBeInTheDocument();
		expect(screen.getByText(/estás en una demostración/i)).toBeInTheDocument();
	});
});
