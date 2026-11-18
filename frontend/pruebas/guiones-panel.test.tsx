import type { SupabaseClient } from "@supabase/supabase-js";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
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
	let falloEscritura = false;
	const invoke = vi.fn(async () => {
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
		auth: {
			signOut: vi.fn(),
			getSession: vi.fn().mockResolvedValue({
				data: { session: { access_token: "sesion-prueba" } },
				error: null,
			}),
		},
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
function borrador(id = "borrador"): Fila {
	return {
		id,
		estado: "borrador",
		creado_en: "2026-11-16T12:00:00Z",
		actualizado_en: "2026-11-16T12:00:00Z",
		creado_por: "admin",
		generado: guion,
		editado: guion,
		instruccion: {
			producto_id: null,
			campana: "Semana del antojo",
			objetivo: "dar_a_conocer",
			tono: "Cercano",
			red: "instagram",
			duracion_s: 30,
		},
	};
}

async function abrirBorrador(nombre = "Un antojo Fresura") {
	fireEvent.click(
		await screen.findByRole("button", {
			name: new RegExp(`^Abrir\\s*${nombre}$`),
		}),
	);
	await screen.findByLabelText("Título");
}

afterEach(() => vi.restoreAllMocks());

describe("guiones del panel", () => {
	it("un rechazo de permisos al guardar conserva el guion y enfoca la explicación", async () => {
		const simulado = montar(simularCliente([borrador()]));
		await abrirBorrador();
		await screen.findByLabelText("Título");
		fireEvent.change(screen.getByLabelText("Título"), {
			target: { value: "Título revisado" },
		});
		simulado.fallarEscritura();
		fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		const aviso = await screen.findByRole("alert");
		expect(aviso).toHaveTextContent("Vuelve a entrar al panel");
		await waitFor(() => expect(aviso).toHaveFocus());
		expect(screen.getByLabelText("Título")).toHaveValue("Título revisado");
		expect(simulado.filas[0].editado).toEqual(guion);
	});
	it("pide confirmación al salir sin guardar y permite cancelar para guardar", async () => {
		const irVersiones = vi.fn();
		montar(simularCliente([borrador()]), irVersiones);
		await abrirBorrador();
		fireEvent.change(screen.getByLabelText("Título"), {
			target: { value: "Título revisado" },
		});
		await screen.findByLabelText("Título");
		const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
		fireEvent.click(screen.getByRole("button", { name: "Versiones" }));
		expect(irVersiones).not.toHaveBeenCalled();
		expect(confirmar).toHaveBeenCalled();
		// Con la máquina cargada, el aviso de salida y el guardado pueden tardar más
		// que la espera por defecto: se espera de forma explícita para no fallar al azar.
		await waitFor(() => {
			const salida = new Event("beforeunload", { cancelable: true });
			window.dispatchEvent(salida);
			expect(salida.defaultPrevented).toBe(true);
		});
		fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		await screen.findByText(
			"Guion guardado como borrador.",
			{},
			{ timeout: 5000 },
		);
		fireEvent.click(screen.getByRole("button", { name: "Versiones" }));
		await waitFor(() => expect(irVersiones).toHaveBeenCalledOnce());
	});
	it("enfoca el editor al abrir otro guion y conserva el foco al guardar o reabrir el mismo", async () => {
		const segundo = {
			...borrador("otro"),
			editado: { ...guion, titulo: "Otro guion" },
		};
		montar(simularCliente([borrador(), segundo]));
		await abrirBorrador();
		const campoTitulo = screen.getByLabelText("Título");
		const encabezado = screen.getByRole("heading", { name: "Revisar guion" });
		campoTitulo.focus();
		fireEvent.change(campoTitulo, { target: { value: "Título revisado" } });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		});
		expect(screen.getByText("Guion guardado como borrador.")).toBeVisible();
		expect(campoTitulo).toHaveFocus();
		const abrir = screen.getByRole("button", {
			name: /^Abrir\s*Título revisado$/,
		});
		abrir.focus();
		await act(async () => {
			fireEvent.click(abrir);
		});
		expect(abrir).toHaveFocus();
		fireEvent.click(
			screen.getByRole("button", { name: /^Abrir\s*Otro guion$/ }),
		);
		await waitFor(() => expect(encabezado).toHaveFocus());
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
		const simulado = montar(simularCliente([borrador()]));
		await abrirBorrador();
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
	it("muestra el chat como único medio para generar guiones", async () => {
		montar();
		expect(
			await screen.findByRole("heading", { name: "Conversar con el agente" }),
		).toBeVisible();
		expect(screen.queryByLabelText("Producto")).not.toBeInTheDocument();
	});
	it("avisa del campo inválido en español y conserva la edición sin escribir en la base", async () => {
		const simulado = montar(simularCliente([borrador()]));
		await abrirBorrador();
		await screen.findByLabelText("Título");
		fireEvent.change(screen.getByLabelText("Título"), {
			target: { value: "" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Revisa Título: completa el campo y respeta su longitud máxima.",
		);
		expect(simulado.filas[0].editado).toEqual(guion);
		expect(screen.getByLabelText("Título")).toHaveValue("");
	});
	it("guarda generado y editado por separado, aprueba y devuelve a borrador al editar con confirmación", async () => {
		const simulado = montar(simularCliente([borrador()]));
		await abrirBorrador();
		await screen.findByLabelText("Título");
		fireEvent.change(screen.getByLabelText("Título"), {
			target: { value: "Título revisado" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
		await screen.findByText("Guion guardado como borrador.");
		expect(simulado.filas[0]).toMatchObject({
			estado: "borrador",
			generado: { titulo: "Un antojo Fresura" },
			editado: { titulo: "Título revisado" },
			instruccion: { producto_id: null },
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
		montar(simularCliente([borrador()]));
		await abrirBorrador();
		await screen.findByLabelText("Título");
		expect(
			screen.getByRole("button", { name: "Generar prompt de video" }),
		).toBeDisabled();
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
