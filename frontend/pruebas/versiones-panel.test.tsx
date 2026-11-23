import type { SupabaseClient } from "@supabase/supabase-js";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
	crearServicioVersiones,
	type VersionContenido,
} from "../src/panel/versiones/servicioVersiones";
import { VersionesPanel } from "../src/panel/versiones/VersionesPanel";
import type { Database } from "../src/tipos/database.types";
import contenido from "./datos/contenido-prueba.json";

const publicada: VersionContenido = {
	id: "publicada",
	estado: "publicada",
	revision: 3,
	json: contenido,
	version_contrato: "1.0.0",
	publicada_en: "2026-11-15T15:00:00Z",
};
const borrador: VersionContenido = {
	...publicada,
	id: "borrador",
	estado: "borrador",
	revision: 1,
	publicada_en: null,
};
const conflicto =
	"Alguien más cambió este contenido. Recarga para ver la última versión.";

function simularCliente() {
	const respuesta = {
		data: [publicada] as unknown,
		error: null as null | { code: string },
	};
	const consulta = {
		select: vi.fn(() => consulta),
		eq: vi.fn(() => consulta),
		insert: vi.fn(() => consulta),
		update: vi.fn(() => consulta),
		delete: vi.fn(() => consulta),
		maybeSingle: vi.fn(async () => ({
			...respuesta,
			data: Array.isArray(respuesta.data)
				? (respuesta.data[0] ?? null)
				: respuesta.data,
		})),
		// biome-ignore lint/suspicious/noThenProperty: PostgREST expone consultas encadenables que se esperan con await.
		then: (resolver: (valor: typeof respuesta) => unknown) =>
			Promise.resolve(respuesta).then(resolver),
	};
	const invoke = vi.fn(async () => ({
		data: { publicada_en: "2026-11-16T15:00:00Z" },
		error: null as unknown,
	}));
	const cliente = {
		from: vi.fn(() => consulta),
		functions: { invoke },
	} as unknown as SupabaseClient<Database>;
	return { cliente, consulta, respuesta, invoke };
}

describe("borrador con revisión", () => {
	it("lee publicada, anterior y borrador y crea una copia sin metadatos de publicación", async () => {
		const { cliente, consulta, respuesta } = simularCliente();
		const servicio = crearServicioVersiones(cliente);
		expect((await servicio.leer()).publicada?.publicada_en).toBe(
			"2026-11-15T15:00:00Z",
		);
		respuesta.data = borrador;
		expect((await servicio.editar(publicada)).revision).toBe(1);
		expect(consulta.insert).toHaveBeenCalledWith({
			estado: "borrador",
			json: contenido,
			version_contrato: "1.0.0",
		});
	});
	it("señala conflicto si otra persona creó el borrador", async () => {
		const { cliente, respuesta } = simularCliente();
		respuesta.error = { code: "23505" };
		await expect(
			crearServicioVersiones(cliente).editar(publicada),
		).rejects.toThrow(conflicto);
	});
	it("guarda con la revisión leída y devuelve la nueva", async () => {
		const { cliente, consulta, respuesta } = simularCliente();
		respuesta.data = { ...borrador, revision: 2 };
		expect(
			(await crearServicioVersiones(cliente).guardar(borrador, contenido))
				.revision,
		).toBe(2);
		expect(consulta.eq).toHaveBeenCalledWith("revision", 1);
		expect(consulta.eq).toHaveBeenCalledWith("id", "borrador");
	});
	it("no sobrescribe ni descarta cuando cambió la revisión", async () => {
		const { cliente, respuesta } = simularCliente();
		respuesta.data = null;
		const servicio = crearServicioVersiones(cliente);
		await expect(servicio.guardar(borrador, contenido)).rejects.toThrow(
			conflicto,
		);
		await expect(servicio.descartar(borrador)).rejects.toThrow(conflicto);
	});
	it("valida e indica el campo antes de escribir", async () => {
		const { cliente, consulta } = simularCliente();
		await expect(
			crearServicioVersiones(cliente).guardar(borrador, {
				...contenido,
				version_contrato: "incorrecta",
			}),
		).rejects.toThrow(/versión del contenido/);
		expect(consulta.update).not.toHaveBeenCalled();
	});
	it("ante un rechazo de red muestra el mensaje de publicación en español", async () => {
		const { cliente, invoke } = simularCliente();
		invoke.mockRejectedValue(new TypeError("Failed to fetch"));
		await expect(crearServicioVersiones(cliente).restaurar()).rejects.toThrow(
			"No se pudo publicar. El sitio sigue igual. Inténtalo de nuevo.",
		);
	});
	it("descarta solo el borrador leído", async () => {
		const { cliente, consulta, respuesta } = simularCliente();
		respuesta.data = borrador;
		await crearServicioVersiones(cliente).descartar(borrador);
		expect(consulta.delete).toHaveBeenCalled();
		expect(consulta.eq).toHaveBeenCalledWith("estado", "borrador");
		expect(consulta.eq).toHaveBeenCalledWith("revision", 1);
	});
	it.each([false, true])(
		"publica con aprobación %s sin cambiarla implícitamente",
		async (aprobado) => {
			const { cliente, invoke } = simularCliente();
			await crearServicioVersiones(cliente).publicar(borrador, aprobado);
			expect(invoke).toHaveBeenCalledWith("panel/publicar", {
				body: { revision: 1, contenido_real: aprobado },
			});
		},
	);
	it("restaura con el JWT del cliente y cuerpo vacío", async () => {
		const { cliente, invoke } = simularCliente();
		await crearServicioVersiones(cliente).restaurar();
		expect(invoke).toHaveBeenCalledWith("panel/restaurar", { body: {} });
	});
	it.each([400, 401, 403, 404, 409, 500])(
		"muestra el mensaje devuelto por la función (%s)",
		async (estado) => {
			const { cliente, invoke } = simularCliente();
			invoke.mockResolvedValue({
				data: null as never,
				error: {
					context: new Response(
						JSON.stringify({ error: "error", mensaje: `Mensaje ${estado}` }),
						{ status: estado },
					),
				},
			});
			await expect(
				crearServicioVersiones(cliente).publicar(borrador, false),
			).rejects.toThrow(`Mensaje ${estado}`);
		},
	);
});

describe("pantalla de versiones", () => {
	beforeAll(() => {
		// jsdom no abre diálogos; el navegador real también gestiona el foco y el fondo inerte.
		HTMLDialogElement.prototype.showModal = function () {
			this.setAttribute("open", "");
		};
	});
	beforeEach(() => vi.restoreAllMocks());
	it.each([false, true])(
		"envía la aprobación elegida en pantalla: %s",
		async (aprobado) => {
			const { cliente, respuesta, invoke } = simularCliente();
			respuesta.data = [publicada, borrador];
			render(
				<MemoryRouter>
					<VersionesPanel cliente={cliente} />
				</MemoryRouter>,
			);
			const casilla = await screen.findByRole("checkbox", {
				name: "Todo el contenido fue aprobado por Fresura",
			});
			if (aprobado) fireEvent.click(casilla);
			fireEvent.click(screen.getByRole("button", { name: "Publicar cambios" }));
			expect(
				screen.getByRole("button", { name: "Publicando…" }),
			).toBeDisabled();
			expect(await screen.findByText("¡Listo!")).toBeInTheDocument();
			expect(invoke).toHaveBeenCalledWith("panel/publicar", {
				body: { revision: 1, contenido_real: aprobado },
			});
		},
	);
	it("abre la vista previa solo después de guardar y no la abre ante conflicto", async () => {
		const { cliente, respuesta, consulta } = simularCliente();
		respuesta.data = [publicada, borrador];
		const abrir = vi.fn();
		render(
			<MemoryRouter>
				<VersionesPanel cliente={cliente} abrirVistaPrevia={abrir} />
			</MemoryRouter>,
		);
		const boton = await screen.findByRole("button", {
			name: "Ver vista previa",
		});
		let terminar: (valor: {
			data: VersionContenido | null;
			error: null;
		}) => void = () => {};
		consulta.maybeSingle.mockImplementationOnce(
			() =>
				new Promise((resolver) => {
					terminar = resolver;
				}),
		);
		fireEvent.click(boton);
		expect(abrir).not.toHaveBeenCalled();
		terminar({ data: { ...borrador, revision: 2 }, error: null });
		await waitFor(() => expect(abrir).toHaveBeenCalledOnce());
		consulta.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
		fireEvent.click(boton);
		expect(await screen.findByRole("alert")).toHaveTextContent(conflicto);
		expect(abrir).toHaveBeenCalledOnce();
	});
	it("sin anterior deshabilita restaurar y sin borrador permite editar", async () => {
		const { cliente } = simularCliente();
		render(
			<MemoryRouter>
				<VersionesPanel cliente={cliente} />
			</MemoryRouter>,
		);
		expect(
			await screen.findByRole("button", {
				name: "Volver a la versión anterior",
			}),
		).toBeDisabled();
		expect(screen.getByRole("button", { name: "Editar" })).toBeEnabled();
	});
	it("pide confirmación antes de descartar y permite cancelar", async () => {
		const { cliente, respuesta, consulta } = simularCliente();
		respuesta.data = [publicada, borrador];
		render(
			<MemoryRouter>
				<VersionesPanel cliente={cliente} />
			</MemoryRouter>,
		);
		fireEvent.click(
			await screen.findByRole("button", { name: "Descartar cambios" }),
		);
		expect(
			screen.getByRole("heading", { name: "¿Descartar los cambios?" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("dialog", { name: "¿Descartar los cambios?" }),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		expect(consulta.delete).not.toHaveBeenCalled();
	});
	it("al restaurar avisa del borrador y ofrece descartarlo sin hacerlo automáticamente", async () => {
		const { cliente, respuesta, invoke, consulta } = simularCliente();
		respuesta.data = [
			publicada,
			borrador,
			{ ...publicada, estado: "anterior" },
		];
		render(
			<MemoryRouter>
				<VersionesPanel cliente={cliente} />
			</MemoryRouter>,
		);
		fireEvent.click(
			await screen.findByRole("button", {
				name: "Volver a la versión anterior",
			}),
		);
		expect(screen.getByText("Tienes cambios sin publicar")).toBeInTheDocument();
		expect(invoke).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "Sí, volver" }));
		expect(await screen.findByText("¡Listo!")).toBeInTheDocument();
		expect(consulta.delete).not.toHaveBeenCalled();
	});
});
