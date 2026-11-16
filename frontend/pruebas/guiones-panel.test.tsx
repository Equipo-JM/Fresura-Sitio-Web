import type { SupabaseClient } from "@supabase/supabase-js";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuionesPanel } from "../src/panel/guiones/GuionesPanel";
import type { Database, Json } from "../src/tipos/database.types";
import contenido from "./datos/contenido-prueba.json";

const guion = {
	titulo: "Un antojo Fresura",
	gancho: "Mira este antojo",
	escenas: [
		{
			inicio_s: 0,
			fin_s: 30,
			que_se_ve: "El producto",
			texto_pantalla: "Fresura",
			voz: "Ven a probarlo",
		},
	],
	llamado_accion: "Escríbenos",
	texto_publicacion: "Un antojo para hoy",
	musica_sugerida: "Ritmo suave",
	notas_produccion: "Luz natural",
};
type Fila = Database["public"]["Tables"]["guiones"]["Row"];

function simularCliente(iniciales: Fila[] = []) {
	const filas = [...iniciales];
	let prompt: Json | null = null;
	let fallo: string | null = null;
	let falloEscritura = false;
	const invoke = vi.fn(async (ruta: string) => {
		if (fallo)
			return {
				data: null,
				error: {
					context: new Response(
						JSON.stringify({ error: "ia_limite_minuto", mensaje: fallo }),
					),
				},
			};
		if (ruta === "ia/guion")
			return { data: { guion, modelo: "modelo-prueba" }, error: null };
		prompt = {
			herramienta: "avatar",
			estilo_general: "Luz natural",
			escenas: [
				{
					orden: 1,
					texto_avatar: "Ven a probarlo",
					indicaciones: "Mirar a cámara",
				},
			],
			texto_copiar: "Ven a probarlo",
		};
		return { data: { prompt, modelo: "modelo-prueba" }, error: null };
	});
	const cliente = {
		functions: { invoke },
		auth: { signOut: vi.fn() },
		from(tabla: string) {
			let operacion = "leer";
			let valores: Record<string, unknown> = {};
			const filtros: Record<string, unknown> = {};
			const ejecutar = () => {
				if (operacion !== "leer" && falloEscritura)
					return { data: null, error: { code: "42501" } };
				if (tabla === "versiones_contenido")
					return { data: { json: contenido }, error: null };
				if (tabla === "prompts_video")
					return { data: prompt ? { contenido: prompt } : null, error: null };
				if (operacion === "insertar") {
					const fila = {
						id: "guion-1",
						creado_en: "2026-11-16T12:00:00Z",
						actualizado_en: "2026-11-16T12:00:00Z",
						creado_por: "admin",
						...valores,
					} as Fila;
					filas.push(fila);
					return { data: fila, error: null };
				}
				const indice = filas.findIndex((fila) =>
					Object.entries(filtros).every(
						([campo, valor]) => fila[campo as keyof Fila] === valor,
					),
				);
				if (operacion === "actualizar" && indice >= 0) {
					filas[indice] = { ...filas[indice], ...valores } as Fila;
					if (valores.estado !== "aprobado") prompt = null;
					return { data: filas[indice], error: null };
				}
				if (operacion === "eliminar")
					return { data: filas.splice(indice, 1)[0] ?? null, error: null };
				return { data: [...filas], error: null };
			};
			const consulta = {
				select: () => consulta,
				order: () => consulta,
				eq(campo: string, valor: unknown) {
					filtros[campo] = valor;
					return consulta;
				},
				insert(datos: Record<string, unknown>) {
					operacion = "insertar";
					valores = datos;
					return consulta;
				},
				update(datos: Record<string, unknown>) {
					operacion = "actualizar";
					valores = datos;
					return consulta;
				},
				delete() {
					operacion = "eliminar";
					return consulta;
				},
				maybeSingle: async () => ejecutar(),
				// biome-ignore lint/suspicious/noThenProperty: PostgREST devuelve consultas esperables.
				then: (resolver: (valor: ReturnType<typeof ejecutar>) => unknown) =>
					Promise.resolve(ejecutar()).then(resolver),
			};
			return consulta;
		},
	} as unknown as SupabaseClient<Database>;
	return {
		cliente,
		filas,
		invoke,
		fallarEscritura: () => {
			falloEscritura = true;
		},
		guardarPrompt: (valor: Json) => {
			prompt = valor;
		},
		fallar: (mensaje: string) => {
			fallo = mensaje;
		},
	};
}

function montar(simulado = simularCliente(), irVersiones = vi.fn()) {
	render(
		<MemoryRouter>
			<GuionesPanel cliente={simulado.cliente} irVersiones={irVersiones} />
		</MemoryRouter>,
	);
	return simulado;
}
async function generar() {
	await screen.findByRole("option", { name: contenido.productos[0].nombre });
	fireEvent.change(screen.getByLabelText("Producto"), {
		target: { value: contenido.productos[0].id },
	});
	fireEvent.change(screen.getByLabelText("Campaña (opcional)"), {
		target: { value: "Semana del antojo" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Generar guion" }));
}
afterEach(() => vi.restoreAllMocks());

describe("guiones del panel", () => {
	it("un rechazo de permisos al guardar conserva el guion y enfoca la explicación", async () => {
		const simulado = montar();
		await generar();
		await screen.findByLabelText("Título");
		simulado.fallarEscritura();
		fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		const aviso = await screen.findByRole("alert");
		expect(aviso).toHaveTextContent("Vuelve a entrar al panel");
		expect(aviso).toHaveFocus();
		expect(screen.getByLabelText("Título")).toHaveValue("Un antojo Fresura");
		expect(simulado.filas).toHaveLength(0);
	});
	it("pide confirmación al salir sin guardar y permite cancelar para guardar", async () => {
		const irVersiones = vi.fn();
		montar(simularCliente(), irVersiones);
		await generar();
		await screen.findByLabelText("Título");
		const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
		fireEvent.click(screen.getByRole("button", { name: "Versiones" }));
		expect(irVersiones).not.toHaveBeenCalled();
		expect(confirmar).toHaveBeenCalled();
		const salida = new Event("beforeunload", { cancelable: true });
		window.dispatchEvent(salida);
		expect(salida.defaultPrevented).toBe(true);
		fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		await screen.findByText("Guion guardado como borrador.");
		fireEvent.click(screen.getByRole("button", { name: "Versiones" }));
		expect(irVersiones).toHaveBeenCalledOnce();
	});
	it("abre un aprobado con su prompt guardado y lo oculta después de confirmar la edición", async () => {
		const fila: Fila = {
			id: "guardado",
			estado: "aprobado",
			creado_en: "2026-11-16T12:00:00Z",
			actualizado_en: "2026-11-16T12:00:00Z",
			creado_por: "admin",
			generado: guion,
			editado: guion,
			instruccion: {
				producto_id: contenido.productos[0].id,
				producto_nombre: "Producto histórico",
				campana: null,
				objetivo: "dar_a_conocer",
				tono: "Cercano",
				red: "instagram",
				duracion_s: 30,
			},
		};
		const simulado = simularCliente([fila]);
		simulado.guardarPrompt({
			herramienta: "escenas",
			estilo_general: "Luz suave",
			escenas: [{ orden: 1, descripcion: 'Una persona dice "Hola".' }],
			texto_copiar: "Prompt anterior",
		});
		montar(simulado);
		fireEvent.click(await screen.findByRole("button", { name: /^Abrir/ }));
		expect(await screen.findByLabelText("Texto para copiar")).toHaveValue(
			"Prompt anterior",
		);
		expect(screen.getByLabelText("Título")).toBeDisabled();
		vi.spyOn(window, "confirm").mockReturnValue(true);
		fireEvent.click(screen.getByRole("button", { name: "Editar" }));
		await waitFor(() =>
			expect(
				screen.queryByLabelText("Texto para copiar"),
			).not.toBeInTheDocument(),
		);
		expect(simulado.filas[0].estado).toBe("borrador");
		expect(screen.getByLabelText("Título")).toBeEnabled();
	});
	it("descarta y recupera; eliminar pide confirmación y retira el guion de la lista", async () => {
		const simulado = montar();
		await generar();
		await screen.findByLabelText("Título");
		fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		await screen.findByText("Guion guardado como borrador.");
		const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
		fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
		expect(simulado.filas[0].estado).toBe("borrador");
		confirmar.mockReturnValue(true);
		fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
		fireEvent.click(await screen.findByRole("button", { name: "Recuperar" }));
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "Aprobar" })).toBeEnabled(),
		);
		expect(simulado.filas[0].estado).toBe("borrador");
		confirmar.mockReturnValue(false);
		fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
		expect(simulado.filas).toHaveLength(1);
		confirmar.mockReturnValue(true);
		fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
		await screen.findByText("Guion eliminado.");
		expect(
			screen.queryByRole("button", { name: /Abrir/ }),
		).not.toBeInTheDocument();
		expect(simulado.filas).toHaveLength(0);
	});
	it("genera con las instrucciones y permite editar todos los campos sin guardar automáticamente", async () => {
		const simulado = montar();
		await generar();
		expect(await screen.findByLabelText("Título")).toHaveValue(
			"Un antojo Fresura",
		);
		expect(screen.getByLabelText("Voz o diálogo · escena 1")).toHaveValue(
			"Ven a probarlo",
		);
		expect(simulado.filas).toHaveLength(0);
		expect(simulado.invoke).toHaveBeenCalledWith(
			"ia/guion",
			expect.objectContaining({
				body: {
					producto_id: contenido.productos[0].id,
					campana: "Semana del antojo",
					objetivo: "dar_a_conocer",
					tono: "Cercano e inspirador",
					red: "instagram",
					duracion_s: 30,
				},
			}),
		);
	});
	it("avisa del campo inválido en español y conserva la edición sin escribir en la base", async () => {
		const simulado = montar();
		await generar();
		await screen.findByLabelText("Título");
		fireEvent.change(screen.getByLabelText("Título"), {
			target: { value: "" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Revisa Título: completa el campo y respeta su longitud máxima.",
		);
		expect(simulado.filas).toHaveLength(0);
		expect(screen.getByLabelText("Título")).toHaveValue("");
	});
	it("muestra ia_limite_minuto y conserva el formulario para reintentar", async () => {
		const simulado = simularCliente();
		simulado.fallar(
			"Hay muchas solicitudes. Espera un minuto e inténtalo de nuevo.",
		);
		montar(simulado);
		await generar();
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Espera un minuto",
		);
		expect(screen.getByLabelText("Campaña (opcional)")).toHaveValue(
			"Semana del antojo",
		);
		expect(screen.getByLabelText("Producto")).toHaveValue(
			contenido.productos[0].id,
		);
		expect(simulado.invoke).toHaveBeenCalledTimes(1);
	});
	it("guarda generado y editado por separado, aprueba y devuelve a borrador al editar con confirmación", async () => {
		const simulado = montar();
		await generar();
		await screen.findByLabelText("Título");
		fireEvent.change(screen.getByLabelText("Título"), {
			target: { value: "Título revisado" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		await waitFor(() => expect(simulado.filas).toHaveLength(1));
		expect(simulado.filas[0]).toMatchObject({
			estado: "borrador",
			generado: { titulo: "Un antojo Fresura" },
			editado: { titulo: "Título revisado" },
			instruccion: { producto_nombre: contenido.productos[0].nombre },
		});
		fireEvent.click(screen.getByRole("button", { name: "Aprobar" }));
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Generar prompt de video" }),
			).toBeEnabled(),
		);
		const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
		fireEvent.click(screen.getByRole("button", { name: "Editar" }));
		expect(simulado.filas[0].estado).toBe("aprobado");
		confirmar.mockReturnValue(true);
		fireEvent.click(screen.getByRole("button", { name: "Editar" }));
		await waitFor(() => expect(screen.getByLabelText("Título")).toBeEnabled());
		expect(simulado.filas[0].estado).toBe("borrador");
		expect(
			screen.getByRole("button", { name: "Generar prompt de video" }),
		).toBeDisabled();
	});
	it("deshabilita el prompt sin aprobación y genera y copia el prompt aprobado", async () => {
		const copiar = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: { writeText: copiar },
		});
		montar();
		await generar();
		await screen.findByLabelText("Título");
		expect(
			screen.getByRole("button", { name: "Generar prompt de video" }),
		).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "Aprobar" })).toBeEnabled(),
		);
		fireEvent.click(screen.getByRole("button", { name: "Aprobar" }));
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Generar prompt de video" }),
			).toBeEnabled(),
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Generar prompt de video" }),
		);
		expect(await screen.findByText("Mirar a cámara")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Copiar prompt" }));
		await waitFor(() => expect(copiar).toHaveBeenCalledWith("Ven a probarlo"));
		expect(screen.getByRole("status")).toHaveTextContent("Texto copiado");
	});
});
