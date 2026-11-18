import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { esquemaContenido } from "../../backend/supabase/functions/_shared/esquemas/contenido";
import { fotoRappi, tieneFoto } from "../src/compartido/contenido/fotos";
import { TarjetaProducto } from "../src/sitio/inicio/Categorias";
import prueba from "./datos/contenido-prueba.json";

const productos = esquemaContenido.parse(prueba).productos;
const producto = productos[0];

function mostrarTarjeta(ruta: string, base = producto) {
	render(
		<MemoryRouter>
			<TarjetaProducto
				producto={{
					...base,
					imagen: { ...producto.imagen, ruta, alt: "Vaso de fresas" },
				}}
			/>
		</MemoryRouter>,
	);
}

describe("fotos de producto", () => {
	it("un precio pendiente de la fuente principal se anuncia por confirmar", () => {
		render(
			<MemoryRouter>
				<TarjetaProducto
					producto={{
						...producto,
						presentaciones: producto.presentaciones.map((p) => ({
							...p,
							precio: null,
						})),
					}}
				/>
			</MemoryRouter>,
		);
		expect(
			screen.getByRole("link", { name: /Precio por confirmar/ }),
		).toBeInTheDocument();
	});
	it("las rutas de ejemplo (.invalid) no cuentan como foto", () => {
		expect(
			tieneFoto({ ...producto.imagen, ruta: "https://ejemplo.invalid/a.webp" }),
		).toBe(false);
		expect(tieneFoto({ ...producto.imagen, ruta: "no es una url" })).toBe(
			false,
		);
	});

	it("sin foto publicada usa la provisional de Rappi, marcada por validar", () => {
		mostrarTarjeta("https://ejemplo.invalid/fresas.webp");
		expect(
			screen.getByRole("img", { name: "Arma tu Fresita, foto provisional" }),
		).toHaveAttribute("src", "/ejemplos/productos/arma-tu-fresita-9oz.webp");
		expect(screen.getAllByText("Por validar").length).toBeGreaterThan(0);
		expect(screen.queryByRole("img", { name: "Vaso de fresas" })).toBeNull();
	});

	it("sin foto publicada ni de Rappi, Arma tu usa la textura de DD-43", () => {
		mostrarTarjeta("https://ejemplo.invalid/fresas.webp", {
			...producto,
			id: "sin-foto-rappi",
		});
		expect(
			screen.getByRole("img", { name: "Textura de crema, foto de referencia" }),
		).toHaveAttribute("src", "/ejemplos/textura-crema.webp");
	});

	it("todos los productos del menú tienen foto de Rappi", () => {
		const sinFoto = productos.filter((p) => !fotoRappi(p.id)).map((p) => p.id);
		expect(sinFoto).toEqual([]);
	});

	it("con la foto que sube el panel al bucket, la muestra en la tarjeta", () => {
		const ruta =
			"https://proyecto.supabase.co/storage/v1/object/public/fotos/abc123.webp";
		mostrarTarjeta(ruta);
		expect(screen.getByRole("img", { name: "Vaso de fresas" })).toHaveAttribute(
			"src",
			ruta,
		);
		expect(screen.queryByText("Foto del producto")).toBeNull();
	});
});
