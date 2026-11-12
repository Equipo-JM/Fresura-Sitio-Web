import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prueba from "../public/contenido-prueba.json";
import respaldo from "../public/contenido-respaldo.json";
import {
	agregarLinea,
	vaciarCarrito,
} from "../src/compartido/carrito/almacenCarrito";
import { RutasDelSitio } from "../src/RutasDelSitio";

/** Simula la red: la fuente principal (JSON de prueba o Supabase) responde o falla; el respaldo siempre responde. */
function simularContenido(principalDisponible: boolean) {
	vi.spyOn(globalThis, "fetch").mockImplementation(async (entrada) => {
		const ruta = String(entrada);
		if (ruta.includes("contenido-respaldo")) {
			return Response.json(structuredClone(respaldo));
		}
		if (!principalDisponible) return new Response("caído", { status: 503 });
		// Sirve tanto el JSON de prueba como la consulta a Supabase
		// (`versiones_contenido`), que devuelve la versión en la columna `json`.
		if (ruta.includes("versiones_contenido")) {
			return Response.json({ json: structuredClone(prueba) });
		}
		return Response.json(structuredClone(prueba));
	});
}

function mostrarCarrito() {
	const cliente = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<QueryClientProvider client={cliente}>
			<MemoryRouter initialEntries={["/carrito"]}>
				<RutasDelSitio />
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

function escribir(etiqueta: RegExp, valor: string) {
	fireEvent.change(screen.getByLabelText(etiqueta), {
		target: { value: valor },
	});
}

describe("pantalla del carrito", () => {
	beforeEach(() => {
		sessionStorage.clear();
		vaciarCarrito();
		vi.spyOn(console, "warn").mockImplementation(() => {});
		agregarLinea({
			idProducto: "fresitas-arma-tu-fresita",
			idPresentacion: "9-oz",
			seleccion: {},
			cantidad: 1,
			indicaciones: "",
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("tras enviar el pedido, «Empezar otro pedido» vacía el carrito y vuelve al paso 1", async () => {
		simularContenido(true);
		mostrarCarrito();

		fireEvent.click(
			await screen.findByRole("button", { name: "Continuar a la entrega" }),
		);
		escribir(/correo electrónico/i, "ana@correo.com");
		escribir(/teléfono/i, "3001234567");
		fireEvent.click(screen.getByRole("radio", { name: /recoger en/i }));
		escribir(/^nombre/i, "Ana");
		escribir(/apellidos/i, "Ruiz");
		fireEvent.click(screen.getByRole("button", { name: "Revisar pedido" }));

		const enviar = screen.getByRole("link", {
			name: /enviar pedido por whatsapp/i,
		});
		// Al recoger, el mensaje nombra la sede del contenido, no un texto fijo.
		expect(decodeURIComponent(enviar.getAttribute("href") ?? "")).toContain(
			"Recoger en Sede U Nacional",
		);
		enviar.addEventListener("click", (e) => e.preventDefault());
		fireEvent.click(enviar);
		fireEvent.click(
			screen.getByRole("button", { name: "Empezar otro pedido" }),
		);

		expect(
			screen.getByRole("heading", { level: 1, name: /tu carrito está vacío/i }),
		).toBeInTheDocument();
		expect(
			screen.queryByText(/abrimos whatsapp con tu pedido/i),
		).not.toBeInTheDocument();
	});

	it("en modo respaldo desactiva el carrito y ofrece WhatsApp (DD-14)", async () => {
		simularContenido(false);
		mostrarCarrito();

		// El cliente de Supabase reintenta ante un 503 antes de rendirse.
		expect(
			await screen.findByText(
				/consulta precios por whatsapp/i,
				{},
				{ timeout: 8000 },
			),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /pedir por whatsapp/i }),
		).toHaveAttribute("href", expect.stringContaining("https://wa.me/"));
		expect(
			screen.queryByRole("button", { name: "Continuar a la entrega" }),
		).not.toBeInTheDocument();
	}, 10000);
});
