import type { SupabaseClient } from "@supabase/supabase-js";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContenidoPanel } from "../src/panel/contenido/ContenidoPanel";
import type { Database } from "../src/tipos/database.types";
import ejemplo from "./datos/contenido-prueba.json";

function simular(borrador = true) {
	const contenido = structuredClone(ejemplo);
	contenido.productos = contenido.productos.slice(0, 1);
	contenido.promociones = [];
	const fila = {
		id: "version",
		estado: borrador ? "borrador" : "publicada",
		revision: 3,
		json: contenido,
		version_contrato: "1.0.1",
		publicada_en: null,
	};
	let guardado: unknown;
	const consulta = {
		select: vi.fn(() => consulta),
		eq: vi.fn(() => consulta),
		insert: vi.fn(() => consulta),
		update: vi.fn((valor: unknown) => {
			guardado = valor;
			return consulta;
		}),
		maybeSingle: vi.fn(async () => ({
			data: { ...fila, estado: "borrador", revision: 4 },
			error: null,
		})),
		// biome-ignore lint/suspicious/noThenProperty: imita las consultas esperables de PostgREST.
		then: (resolver: (valor: unknown) => unknown) =>
			Promise.resolve({ data: [fila], error: null }).then(resolver),
	};
	const cliente = {
		from: () => consulta,
	} as unknown as SupabaseClient<Database>;
	render(<ContenidoPanel cliente={cliente} />);
	return { consulta, contenido, guardado: () => guardado };
}

describe("formularios del borrador", () => {
	it("rechaza precios fraccionarios, conserva el precio por confirmar y retira sin borrar el producto", async () => {
		const doble = simular();
		fireEvent.click(
			await screen.findByRole("button", { name: /Editar Arma tu/ }),
		);
		const precio = screen.getByLabelText(
			"Precio en pesos (vacío: por confirmar)",
		);
		fireEvent.change(precio, { target: { value: "12000.5" } });
		fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }));
		expect(precio).toHaveAttribute("aria-invalid", "true");
		expect(doble.consulta.update).not.toHaveBeenCalled();
		fireEvent.change(precio, { target: { value: "" } });
		fireEvent.click(
			screen.getByRole("checkbox", { name: "Mostrar en el sitio" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }));
		expect(await screen.findByText("Borrador guardado")).toBeInTheDocument();
		expect(doble.guardado()).toMatchObject({
			json: {
				productos: [
					{
						id: "fresitas-arma-tu-fresita",
						vigente: false,
						presentaciones: [{ precio: null }],
					},
				],
			},
		});
	});
	it("abre un producto desde su categoría y conserva los cambios al volver al catálogo", async () => {
		simular();
		const categoria = await screen.findByRole("region", { name: "Fresitas" });
		fireEvent.click(
			within(categoria).getByRole("button", { name: "Editar Arma tu Fresita" }),
		);
		const volver = screen.getByRole("button", { name: "Volver a productos" });
		expect(volver).toHaveFocus();
		fireEvent.change(screen.getByLabelText("Nombre"), {
			target: { value: "Mi Fresita" },
		});
		fireEvent.click(volver);
		expect(screen.getByRole("heading", { name: "Productos" })).toHaveFocus();
		fireEvent.click(screen.getByRole("button", { name: "Editar Mi Fresita" }));
		expect(screen.getByLabelText("Nombre")).toHaveValue("Mi Fresita");
	});
	it("cancelar la recarga conserva lo escrito", async () => {
		simular();
		fireEvent.click(
			await screen.findByRole("button", { name: /Editar Arma tu/ }),
		);
		fireEvent.change(screen.getByLabelText("Nombre"), {
			target: { value: "Pendiente" },
		});
		vi.spyOn(window, "confirm").mockReturnValueOnce(false);
		fireEvent.click(screen.getByRole("button", { name: "Recargar" }));
		expect(screen.getByLabelText("Nombre")).toHaveValue("Pendiente");
	});
	it("crea el borrador al editar, cambia un producto y guarda con su revisión", async () => {
		const doble = simular(false);
		fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
		fireEvent.click(
			await screen.findByRole("button", { name: /Editar Arma tu/ }),
		);
		fireEvent.change(screen.getByLabelText("Nombre"), {
			target: { value: "Fresas nuevas" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }));
		expect(await screen.findByText("Borrador guardado")).toBeInTheDocument();
		expect(doble.guardado()).toMatchObject({
			json: { productos: [{ nombre: "Fresas nuevas" }] },
		});
		expect(doble.consulta.eq).toHaveBeenCalledWith("revision", 4);
	});
	it("señala el campo inválido sin escribir", async () => {
		const { consulta } = simular();
		fireEvent.click(
			await screen.findByRole("button", { name: /Editar Arma tu/ }),
		);
		fireEvent.change(screen.getByLabelText("Nombre"), {
			target: { value: "" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }));
		expect(screen.getByLabelText("Nombre")).toHaveAttribute(
			"aria-invalid",
			"true",
		);
		expect(screen.getByLabelText("Nombre")).toHaveAccessibleDescription(
			/Escribe/,
		);
		expect(screen.getByLabelText("Nombre")).toHaveFocus();
		expect(consulta.update).not.toHaveBeenCalled();
	});
	it("conserva los cambios locales y avisa ante un conflicto de revisión", async () => {
		const { consulta } = simular();
		consulta.maybeSingle.mockResolvedValueOnce({
			data: null as never,
			error: null,
		});
		fireEvent.click(
			await screen.findByRole("button", { name: /Editar Arma tu/ }),
		);
		fireEvent.change(screen.getByLabelText("Nombre"), {
			target: { value: "Sin perder" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Alguien más cambió este contenido. Recarga para ver la última versión.",
		);
		expect(screen.getByLabelText("Nombre")).toHaveValue("Sin perder");
	});
	it("recargar reemplaza la edición local por el borrador del servidor", async () => {
		const doble = simular();
		vi.spyOn(window, "confirm").mockReturnValue(true);
		fireEvent.click(
			await screen.findByRole("button", { name: /Editar Arma tu/ }),
		);
		fireEvent.change(screen.getByLabelText("Nombre"), {
			target: { value: "Local" },
		});
		doble.contenido.productos[0].nombre = "Guardado por otra persona";
		fireEvent.click(screen.getByRole("button", { name: "Recargar" }));
		fireEvent.click(
			await screen.findByRole("button", {
				name: "Editar Guardado por otra persona",
			}),
		);
		expect(screen.getByLabelText("Nombre")).toHaveValue(
			"Guardado por otra persona",
		);
	});
	it("agrega una promoción con productos, fechas y restricciones y rechaza una fecha invertida", async () => {
		const doble = simular();
		fireEvent.click(await screen.findByRole("button", { name: "Promociones" }));
		fireEvent.click(screen.getByRole("button", { name: "Agregar promoción" }));
		fireEvent.change(screen.getByLabelText("Título"), {
			target: { value: "Semana de fresas" },
		});
		fireEvent.change(screen.getByLabelText("Desde"), {
			target: { value: "2026-11-20" },
		});
		fireEvent.change(screen.getByLabelText("Hasta"), {
			target: { value: "2026-11-19" },
		});
		fireEvent.change(screen.getByLabelText("Restricciones y condiciones"), {
			target: { value: "Solo en sede" },
		});
		fireEvent.click(screen.getByRole("checkbox", { name: /Arma tu/ }));
		fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }));
		expect(screen.getByLabelText("Hasta")).toHaveAttribute(
			"aria-invalid",
			"true",
		);
		expect(doble.consulta.update).not.toHaveBeenCalled();
		fireEvent.change(screen.getByLabelText("Hasta"), {
			target: { value: "2026-11-24" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }));
		expect(await screen.findByText("Borrador guardado")).toBeInTheDocument();
		expect(doble.guardado()).toMatchObject({
			json: {
				promociones: [{ id: "semana-de-fresas", condiciones: "Solo en sede" }],
			},
		});
	});
	it("edita la dirección de una sede sin perder horarios ni la sede de pedidos", async () => {
		const doble = simular();
		fireEvent.click(
			await screen.findByRole("button", { name: "Negocio y sedes" }),
		);
		const sede = screen.getAllByRole("group", { name: /Sede:/ })[0];
		fireEvent.change(within(sede).getByLabelText("Dirección"), {
			target: { value: "Calle de prueba 123" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }));
		expect(await screen.findByText("Borrador guardado")).toBeInTheDocument();
		expect(doble.guardado()).toMatchObject({
			json: {
				negocio: {
					sedes: expect.arrayContaining([
						expect.objectContaining({
							direccion: "Calle de prueba 123",
							atiende_pedidos: true,
							horarios: [
								{
									dias: "Lunes a domingo y festivos",
									horas:
										"12:00 m. a 8:00 p. m. Cierre por almuerzo: 2:00 a 2:30 p. m.",
								},
							],
						}),
					]),
				},
			},
		});
	});
});
