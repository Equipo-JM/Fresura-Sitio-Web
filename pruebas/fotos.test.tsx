import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import prueba from "../public/contenido-prueba.json";
import { tieneFoto } from "../src/compartido/contenido/fotos";
import { TarjetaProducto } from "../src/sitio/inicio/Categorias";
import { esquemaContenido } from "../supabase/functions/_shared/esquemas/contenido";

const producto = esquemaContenido.parse(prueba).productos[0];

function mostrarTarjeta(ruta: string) {
	render(
		<MemoryRouter>
			<TarjetaProducto
				producto={{
					...producto,
					imagen: { ...producto.imagen, ruta, alt: "Vaso de fresas" },
				}}
			/>
		</MemoryRouter>,
	);
}

describe("fotos de producto", () => {
	it("las rutas de ejemplo (.invalid) no cuentan como foto", () => {
		expect(
			tieneFoto({ ...producto.imagen, ruta: "https://ejemplo.invalid/a.webp" }),
		).toBe(false);
		expect(tieneFoto({ ...producto.imagen, ruta: "no es una url" })).toBe(
			false,
		);
	});

	it("sin foto real muestra el espacio «Foto del producto»", () => {
		mostrarTarjeta("https://ejemplo.invalid/fresas.webp");
		expect(screen.getByText("Foto del producto")).toBeInTheDocument();
		expect(screen.queryByRole("img", { name: "Vaso de fresas" })).toBeNull();
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
