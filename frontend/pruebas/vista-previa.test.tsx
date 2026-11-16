import type { SupabaseClient } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import * as fotosDemo from "../src/compartido/fotos/almacenFotosDemo";
import { VistaPrevia } from "../src/panel/versiones/VistaPrevia";
import { ConContenido } from "../src/sitio/ConContenido";
import type { Database } from "../src/tipos/database.types";
import contenido from "./datos/contenido-prueba.json";

function Consumidor() {
	return (
		<ConContenido>
			{(datos) => (
				<>
					<p>{datos.negocio.presentacion.titulo}</p>
					<img
						alt="Producto del borrador"
						src={datos.productos[0].imagen.ruta}
						width="100"
						height="100"
					/>
				</>
			)}
		</ConContenido>
	);
}

afterEach(() => vi.restoreAllMocks());

it("usa el borrador del cliente autenticado aunque la publicada esté en caché", async () => {
	vi.spyOn(fotosDemo, "leerFotosDemo").mockReturnValue({
		[`producto:${contenido.productos[0].id}`]: {
			url: "blob:foto-demo",
			alt: "Foto de la demo",
		},
	});
	const eq = vi.fn(() => ({
		single: async () => ({
			data: {
				json: {
					...contenido,
					negocio: {
						...contenido.negocio,
						presentacion: {
							...contenido.negocio.presentacion,
							titulo: "Título del borrador",
						},
					},
				},
			},
			error: null,
		}),
	}));
	const cliente = {
		from: vi.fn(() => ({ select: () => ({ eq }) })),
	} as unknown as SupabaseClient<Database>;
	const consultas = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	consultas.setQueryData(["contenido"], { contenido, origen: "principal" });
	render(
		<QueryClientProvider client={consultas}>
			<MemoryRouter>
				<VistaPrevia cliente={cliente}>
					<Consumidor />
				</VistaPrevia>
			</MemoryRouter>
		</QueryClientProvider>,
	);
	expect(await screen.findByText("Título del borrador")).toBeInTheDocument();
	expect(
		screen.getByRole("img", { name: "Producto del borrador" }),
	).toHaveAttribute("src", contenido.productos[0].imagen.ruta);
	expect(eq).toHaveBeenCalledWith("estado", "borrador");
	expect(screen.getByRole("link", { name: "Volver al panel" })).toHaveAttribute(
		"href",
		"/admin",
	);
	expect(consultas.getQueryData(["contenido"])).toEqual({
		contenido,
		origen: "principal",
	});
});

it("sin borrador no muestra publicada ni respaldo", async () => {
	const cliente = {
		from: () => ({
			select: () => ({
				eq: () => ({
					single: async () => ({ data: null, error: { code: "PGRST116" } }),
				}),
			}),
		}),
	} as unknown as SupabaseClient<Database>;
	render(
		<QueryClientProvider
			client={
				new QueryClient({ defaultOptions: { queries: { retry: false } } })
			}
		>
			<MemoryRouter>
				<VistaPrevia cliente={cliente}>
					<Consumidor />
				</VistaPrevia>
			</MemoryRouter>
		</QueryClientProvider>,
	);
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"No pudimos abrir el borrador",
	);
	expect(
		screen.queryByText(contenido.negocio.presentacion.titulo),
	).not.toBeInTheDocument();
});
