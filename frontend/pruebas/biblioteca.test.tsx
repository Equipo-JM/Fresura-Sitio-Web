import { createClient } from "@supabase/supabase-js";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BibliotecaPanel } from "../src/panel/biblioteca/BibliotecaPanel";
import { leerEntrada } from "../src/panel/biblioteca/servicioBiblioteca";
import type { Database } from "../src/tipos/database.types";

const pieza = {
	tipo: "publicacion",
	titulo: "Antojo de jueves",
	red: "instagram",
	bloques: [
		{ etiqueta: "Texto", texto: "¿Ya tienes antojo?" },
		{ etiqueta: "Hashtags", texto: "#Fresura" },
	],
};
const tarjeta = {
	instruccion: {
		producto_id: null,
		campana: null,
		objetivo: "dar_a_conocer",
		tono: "Cercano",
		red: "tiktok",
		duracion_s: 15,
	},
	guion: {
		titulo: "Fresura en 15 segundos",
		gancho: "¿Antojo?",
		escenas: [
			{
				inicio_s: 0,
				fin_s: 15,
				que_se_ve: "Presentadora en cámara",
				texto_pantalla: "",
				voz: "Ven a Fresura",
			},
		],
		llamado_accion: "Visítanos",
		texto_publicacion: "Hoy",
		musica_sugerida: "Pop",
		notas_produccion: "Luz natural",
	},
};

function fila(
	id: string,
	tipo: string,
	contenido: unknown,
	estado = "borrador",
) {
	return {
		id,
		tipo,
		titulo: `Pieza ${id}`,
		estado,
		creado_en: "2026-11-19T12:00:00Z",
		contenido,
	};
}

function montar() {
	const cambios: { metodo: string; url: string; cuerpo?: unknown }[] = [];
	const fetchSimulado = vi.fn(
		async (entrada: RequestInfo | URL, opciones?: RequestInit) => {
			const metodo = opciones?.method ?? "GET";
			if (metodo !== "GET") {
				cambios.push({
					metodo,
					url: String(entrada),
					cuerpo: opciones?.body
						? JSON.parse(String(opciones.body))
						: undefined,
				});
				return new Response(null, { status: 204 });
			}
			return Response.json([
				fila("1", "publicacion", pieza),
				fila("2", "guion", tarjeta, "aprobada"),
				fila("3", "carrusel", { tipo: "carrusel" }),
			]);
		},
	);
	const cliente = createClient<Database>("https://supabase.invalid", "clave", {
		global: { fetch: fetchSimulado },
		auth: { persistSession: false, autoRefreshToken: false },
	});
	render(<BibliotecaPanel cliente={cliente} />);
	return { cambios };
}

describe("biblioteca de piezas", () => {
	it("descarta filas que no cumplen el contrato actual", () => {
		expect(leerEntrada(fila("x", "carrusel", pieza))).toBeUndefined();
		expect(leerEntrada(fila("y", "publicacion", pieza))?.tipo).toBe(
			"publicacion",
		);
	});

	it("lista, filtra y borra con confirmación, sin estados de aprobación", async () => {
		const { cambios } = montar();
		expect(
			await screen.findByRole("button", { name: /Antojo de jueves/ }),
		).toBeVisible();
		expect(
			screen.getByRole("button", { name: /Fresura en 15 segundos/ }),
		).toBeVisible();
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
		expect(screen.getAllByText(/Guardada el/)).toHaveLength(2);
		expect(
			screen.queryByRole("button", { name: /Aprobar|borrador/i }),
		).toBeNull();

		fireEvent.change(screen.getByLabelText("Tipo de pieza"), {
			target: { value: "guion" },
		});
		expect(screen.queryByText("Antojo de jueves")).toBeNull();
		fireEvent.change(screen.getByLabelText("Tipo de pieza"), {
			target: { value: "todas" },
		});

		fireEvent.click(screen.getByRole("button", { name: /Antojo de jueves/ }));
		fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
		expect(
			screen.getByText("¿Borrar «Pieza 1»? No podrás recuperarla."),
		).toBeVisible();
		fireEvent.click(screen.getByRole("button", { name: "Sí, borrar" }));
		await waitFor(() =>
			expect(cambios.at(-1)).toMatchObject({ metodo: "DELETE" }),
		);
		expect(cambios.map((c) => c.metodo)).toEqual(["DELETE"]);
	});
});
