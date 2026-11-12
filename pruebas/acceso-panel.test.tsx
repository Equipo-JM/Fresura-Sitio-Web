import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { estadoAcceso } from "../src/panel/acceso/estadoAcceso";
import { RutasDelSitio } from "../src/RutasDelSitio";

/** Sesión simulada de Supabase Auth para el panel. */
type SesionFalsa = {
	haySesion: boolean;
	nivel: "aal1" | "aal2";
	factores: number;
	rol?: string;
};

let sesion: SesionFalsa;
const verify = vi.fn();
const signIn = vi.fn();

const clienteFalso = {
	auth: {
		getSession: async () => ({
			data: {
				session: sesion.haySesion
					? { user: { app_metadata: { rol: sesion.rol } } }
					: null,
			},
		}),
		onAuthStateChange: () => ({
			data: { subscription: { unsubscribe: () => {} } },
		}),
		signInWithPassword: signIn,
		signOut: vi.fn(),
		mfa: {
			getAuthenticatorAssuranceLevel: async () => ({
				data: { currentLevel: sesion.nivel },
			}),
			listFactors: async () => ({
				data: {
					totp: Array.from({ length: sesion.factores }, (_, i) => ({
						id: `factor-${i}`,
					})),
					all: [],
				},
			}),
			enroll: async () => ({
				data: {
					id: "nuevo",
					totp: {
						qr_code: "data:image/svg+xml;utf-8,<svg/>",
						secret: "SECRETO",
					},
				},
				error: null,
			}),
			unenroll: vi.fn(),
			challenge: async () => ({ data: { id: "reto" }, error: null }),
			verify,
		},
	},
};

vi.mock("../src/compartido/supabase/clientePanel", () => ({
	obtenerClientePanel: () => clienteFalso,
	panelConfigurado: () => true,
}));

function mostrarPanel() {
	const cliente = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<QueryClientProvider client={cliente}>
			<MemoryRouter initialEntries={["/admin"]}>
				<RutasDelSitio />
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe("estado del acceso al panel", () => {
	const base = { haySesion: true, factoresVerificados: 1, rol: "admin" };
	it("sin sesión pide entrar", () => {
		expect(estadoAcceso({ ...base, haySesion: false, nivel: null })).toBe(
			"sin-sesion",
		);
	});
	it("con contraseña y sin app registrada pide registrarla", () => {
		expect(
			estadoAcceso({ ...base, nivel: "aal1", factoresVerificados: 0 }),
		).toBe("registrar-codigo");
	});
	it("con contraseña y app registrada pide el código", () => {
		expect(estadoAcceso({ ...base, nivel: "aal1" })).toBe("pedir-codigo");
	});
	it("con el código, solo entra el rol admin", () => {
		expect(estadoAcceso({ ...base, nivel: "aal2" })).toBe("dentro");
		expect(estadoAcceso({ ...base, nivel: "aal2", rol: "otro" })).toBe(
			"sin-permiso",
		);
	});
});

describe("ruta /admin con acceso real", () => {
	beforeEach(() => {
		verify.mockReset();
		signIn.mockReset();
	});

	it("sin sesión muestra el formulario y no envía sin el token de Turnstile", async () => {
		sesion = { haySesion: false, nivel: "aal1", factores: 0 };
		mostrarPanel();
		fireEvent.change(await screen.findByLabelText("Correo"), {
			target: { value: "admin@fresura.co" },
		});
		fireEvent.change(screen.getByLabelText("Contraseña"), {
			target: { value: "clave" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
		expect(screen.getByRole("alert")).toHaveTextContent(/antibots/i);
		expect(signIn).not.toHaveBeenCalled();
	});

	it("la primera vez muestra el QR para registrar la app", async () => {
		sesion = { haySesion: true, nivel: "aal1", factores: 0, rol: "admin" };
		mostrarPanel();
		expect(
			await screen.findByRole("img", { name: /código qr/i }),
		).toBeInTheDocument();
		expect(screen.getByText("SECRETO")).toBeInTheDocument();
	});

	it("con la app registrada pide el código y avisa si no es válido", async () => {
		sesion = { haySesion: true, nivel: "aal1", factores: 1, rol: "admin" };
		verify.mockResolvedValue({ error: { message: "Invalid TOTP code" } });
		mostrarPanel();
		fireEvent.change(await screen.findByLabelText("Código de 6 dígitos"), {
			target: { value: "123456" },
		});
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "Verificar" })).toBeEnabled(),
		);
		fireEvent.click(screen.getByRole("button", { name: "Verificar" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(/no es válido/i);
		expect(verify).toHaveBeenCalledWith({
			factorId: "factor-0",
			challengeId: "reto",
			code: "123456",
		});
	});

	it("con el código y rol admin muestra la sección de fotos", async () => {
		sesion = { haySesion: true, nivel: "aal2", factores: 1, rol: "admin" };
		mostrarPanel();
		expect(
			await screen.findByRole("heading", { level: 1, name: "Fotos" }),
		).toBeInTheDocument();
		expect(screen.getByText("Sesión verificada")).toBeInTheDocument();
	});

	it("con el código pero sin rol admin no deja entrar", async () => {
		sesion = { haySesion: true, nivel: "aal2", factores: 1, rol: "otro" };
		mostrarPanel();
		expect(
			await screen.findByRole("heading", { name: /no tiene acceso/i }),
		).toBeInTheDocument();
	});
});
