import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { esquemaContenido } from "../../backend/supabase/functions/_shared/esquemas/contenido";
import { vaciarCarrito } from "../src/compartido/carrito/almacenCarrito";
import { RutasDelSitio } from "../src/RutasDelSitio";
import prueba from "./datos/contenido-prueba.json";

// El proyecto no instala tipos de Node: las pruebas solo necesitan esta lectura local.
declare const process: {
	getBuiltinModule(nombre: "fs"): {
		readFileSync(ruta: string, codificacion: "utf8"): string;
		readdirSync(ruta: string, opciones: { recursive: true }): string[];
	};
};
const { readFileSync, readdirSync } = process.getBuiltinModule("fs");

function mostrar(ruta = "/", contenido: unknown = structuredClone(prueba)) {
	const cliente = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	cliente.setQueryData(["contenido"], {
		contenido: esquemaContenido.parse(contenido),
		origen: "principal",
	});
	return render(
		<QueryClientProvider client={cliente}>
			<MemoryRouter initialEntries={[ruta]}>
				<RutasDelSitio />
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

beforeEach(() => vaciarCarrito());

describe("sitio de varias páginas (RF-02)", () => {
	it.each([
		["/", "Fresura, dulce pero con estilo"],
		["/menu", "Menú · Fresura"],
		["/promociones", "Promociones · Fresura"],
		["/nosotros", "Nosotros · Fresura"],
		["/ayuda", "Ayuda · Fresura"],
		["/sedes", "Sedes y contacto · Fresura"],
	])("%s tiene una sola h1, su título y su descripción", (ruta, titulo) => {
		mostrar(ruta);
		expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
		expect(document.title).toBe(titulo);
		const descripcion = document
			.querySelector('meta[name="description"]')
			?.getAttribute("content");
		expect(descripcion?.length).toBeGreaterThan(40);
	});

	it("cada página tiene una descripción distinta", () => {
		const descripciones = new Set<string>();
		for (const ruta of [
			"/",
			"/menu",
			"/promociones",
			"/nosotros",
			"/ayuda",
			"/sedes",
		]) {
			const { unmount } = mostrar(ruta);
			descripciones.add(
				document
					.querySelector('meta[name="description"]')
					?.getAttribute("content") ?? "",
			);
			unmount();
		}
		expect(descripciones.size).toBe(6);
	});

	it("cada opción del menú abre su propia página", () => {
		mostrar();
		const nav = within(screen.getByRole("navigation", { name: "Principal" }));
		const enlaces = Object.fromEntries(
			nav
				.getAllByRole("link")
				.map((a) => [a.textContent, a.getAttribute("href")]),
		);
		expect(enlaces).toMatchObject({
			Promociones: "/promociones",
			Nosotros: "/nosotros",
			Sedes: "/sedes",
			Ayuda: "/ayuda",
		});
		expect(nav.queryByRole("link", { name: "¿Qué pido?" })).toBeNull();
	});

	it("el desplegable abre el menú completo y cada categoría en /menu", () => {
		mostrar();
		fireEvent.click(screen.getByRole("button", { name: "Menú" }));
		const nav = within(screen.getByRole("navigation", { name: "Principal" }));
		expect(nav.getByRole("link", { name: "Todo el menú" })).toHaveAttribute(
			"href",
			"/menu",
		);
		expect(nav.getByRole("link", { name: "Fresitas" })).toHaveAttribute(
			"href",
			"/menu#cat-fresitas",
		);
	});

	it("el pie enlaza cada página", () => {
		mostrar();
		const pie = within(screen.getByRole("contentinfo"));
		const explora = within(pie.getByRole("navigation", { name: "Explora" }));
		expect(
			explora
				.getAllByRole("link")
				.map((a) => [a.textContent, a.getAttribute("href")]),
		).toEqual([
			["Menú", "/menu"],
			["Promociones", "/promociones"],
			["Nosotros", "/nosotros"],
			["Sedes", "/sedes"],
			["Ayuda", "/ayuda"],
		]);
	});

	it("el inicio queda como portada con accesos a las demás páginas", () => {
		mostrar();
		expect(
			screen
				.getAllByRole("region")
				.map((r) => r.getAttribute("aria-labelledby")),
		).toEqual([
			"titulo-portada",
			"titulo-antojos",
			"titulo-explora",
			"titulo-reciente",
		]);
		const explora = within(
			screen.getByRole("region", { name: "Explora Fresura" }),
		);
		expect(
			explora.getAllByRole("link").map((a) => a.getAttribute("href")),
		).toEqual(["/menu", "/promociones", "/nosotros", "/sedes", "/ayuda"]);
	});

	it("/menu muestra todas las categorías con sus productos", () => {
		mostrar("/menu");
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"Nuestro menú",
		);
		for (const nombre of ["Fresitas", "Fresotas", "Fresuras"]) {
			expect(
				screen.getByRole("heading", { level: 2, name: nombre }),
			).toBeInTheDocument();
		}
	});

	it("/promociones muestra las promociones y lleva al menú", () => {
		mostrar("/promociones");
		const region = screen.getByRole("region", { name: "Promociones" });
		expect(within(region).getByRole("heading", { level: 1 })).toHaveTextContent(
			"Promociones",
		);
		for (const enlace of within(region).getAllByRole("link", {
			name: "Ver el menú",
		})) {
			expect(enlace).toHaveAttribute("href", "/menu");
		}
	});

	it("/nosotros reúne la historia, los valores y la calificación", () => {
		mostrar("/nosotros");
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"Dulce, pero con estilo.",
		);
		for (const valor of ["Calidad", "Estética", "Cercanía"]) {
			expect(screen.getByRole("heading", { name: valor })).toBeInTheDocument();
		}
		expect(document.querySelector("#titulo-google")).not.toBeNull();
	});

	it("/ayuda muestra las preguntas frecuentes", () => {
		mostrar("/ayuda");
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"Preguntas frecuentes",
		);
		expect(document.querySelectorAll("details").length).toBeGreaterThan(0);
	});

	it("elegir un antojo abre el menú en su categoría", async () => {
		mostrar();
		const antojos = within(screen.getByRole("region", { name: /antoja/i }));
		fireEvent.click(antojos.getAllByRole("button")[0]);
		expect(
			await screen.findByRole("heading", { level: 1, name: "Nuestro menú" }),
		).toBeInTheDocument();
	});

	it("ningún enlace del sitio apunta al menú con un ancla del inicio", () => {
		const base = "frontend/src/sitio";
		const archivos = readdirSync(base, { recursive: true }).filter((f) =>
			/\.tsx?$/.test(f),
		);
		const conAncla = archivos.filter((f) =>
			/["`]\/#(menu|cat-|promociones|nosotros|ayuda|sedes)/.test(
				readFileSync(`${base}/${f}`, "utf8"),
			),
		);
		expect(conAncla).toEqual([]);
	});
});
