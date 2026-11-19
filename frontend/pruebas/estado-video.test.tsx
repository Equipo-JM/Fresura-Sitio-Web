import { createClient } from "@supabase/supabase-js";
import {
	act,
	fireEvent,
	render,
	renderHook,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	AVISO_VIDEO_EN_CURSO,
	ENLACE_VIDEO_DID,
} from "../../backend/supabase/functions/_shared/esquemas/chat";
import { ChatAgente } from "../src/panel/agente/ChatAgente";
import {
	AVISO_VIDEO_DEMORADO,
	INTERVALO_ESTADO_VIDEO_MS,
	MAXIMO_CONSULTAS_VIDEO,
	useEstadoVideo,
} from "../src/panel/agente/useEstadoVideo";
import type { Database } from "../src/tipos/database.types";

type Estado = "preparando" | "listo" | "detenido";

function montar(respuestas: Estado[], activo = true) {
	const consultar = vi.fn(async () => ({
		estado: respuestas.shift() ?? ("preparando" as Estado),
		mensaje: "Mensaje final",
	}));
	const alTerminar = vi.fn();
	const vista = renderHook(
		({ activo, clave }) =>
			useEstadoVideo({ activo, clave, consultar, alTerminar }),
		{ initialProps: { activo, clave: "conversacion:mensaje" } },
	);
	return { consultar, alTerminar, vista };
}

async function avanzar(veces = 1) {
	for (let i = 0; i < veces; i++)
		await act(() => vi.advanceTimersByTimeAsync(INTERVALO_ESTADO_VIDEO_MS));
}

describe("consulta automática del estado del video", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("no consulta si no hay un video en curso", async () => {
		const { consultar } = montar([], false);
		await avanzar(3);
		expect(consultar).not.toHaveBeenCalled();
	});

	it("consulta cada intervalo y entrega el resultado una sola vez", async () => {
		const { consultar, alTerminar } = montar(["preparando", "listo"]);
		await act(() => vi.advanceTimersByTimeAsync(INTERVALO_ESTADO_VIDEO_MS - 1));
		expect(consultar).not.toHaveBeenCalled();
		await avanzar(1);
		expect(consultar).toHaveBeenCalledTimes(1);
		expect(alTerminar).not.toHaveBeenCalled();
		await avanzar(3);
		expect(consultar).toHaveBeenCalledTimes(2);
		expect(alTerminar).toHaveBeenCalledExactlyOnceWith("Mensaje final");
	});

	it("cancela la espera al cambiar de conversación o desmontar", async () => {
		const { consultar, alTerminar, vista } = montar(["listo"]);
		vista.rerender({ activo: true, clave: "otra:mensaje" });
		vista.unmount();
		await avanzar(3);
		expect(consultar).not.toHaveBeenCalled();
		expect(alTerminar).not.toHaveBeenCalled();
	});

	it("reintenta tras un fallo y avisa si D-ID supera el tope", async () => {
		const { consultar, alTerminar } = montar([]);
		consultar.mockRejectedValueOnce(new Error("sin red"));
		await avanzar(MAXIMO_CONSULTAS_VIDEO + 2);
		expect(consultar).toHaveBeenCalledTimes(MAXIMO_CONSULTAS_VIDEO);
		expect(alTerminar).toHaveBeenCalledExactlyOnceWith(AVISO_VIDEO_DEMORADO);
	});
});

describe("chat del panel con un video en curso", () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it("muestra Abrir video sin que la persona escriba el estado", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const id = "a0a0a0a0-1111-4111-8111-111111111111";
		const enlace = "https://result.d-id.com/fresura.mp4";
		const cuerpos: unknown[] = [];
		const fetchSimulado = vi.fn(
			async (entrada: RequestInfo | URL, opciones?: RequestInit) => {
				const url = String(entrada);
				if (url.includes("/functions/v1/ia/estado-video")) {
					cuerpos.push(JSON.parse(String(opciones?.body)));
					return Response.json({
						estado: "listo",
						mensaje: `${ENLACE_VIDEO_DID}
${enlace}`,
					});
				}
				if (url.includes("agente_conversaciones"))
					return Response.json([
						{ id, titulo: "Demo con D-ID", actualizado_en: "2026-11-18" },
					]);
				if (url.includes("agente_mensajes"))
					return Response.json([
						{
							id: "envio",
							contenido: {
								role: "assistant",
								content: `El video ya se envió a D-ID. ${AVISO_VIDEO_EN_CURSO}`,
							},
						},
					]);
				throw new Error(`Petición inesperada: ${url}`);
			},
		);
		const cliente = createClient<Database>(
			"https://supabase.invalid",
			"clave-publica-ficticia",
			{
				global: { fetch: fetchSimulado },
				auth: {
					persistSession: false,
					autoRefreshToken: false,
					detectSessionInUrl: false,
					storageKey: `prueba-${crypto.randomUUID()}`,
				},
			},
		);
		vi.spyOn(cliente.auth, "getSession").mockImplementation(
			async () =>
				({
					data: { session: { access_token: "token-ficticio" } },
					error: null,
				}) as Awaited<ReturnType<typeof cliente.auth.getSession>>,
		);
		render(<ChatAgente cliente={cliente} />);
		fireEvent.click(
			await screen.findByRole("button", { name: "Demo con D-ID" }),
		);
		expect(
			await screen.findByText("Esperando el video de D-ID…"),
		).toBeInTheDocument();
		await act(() => vi.advanceTimersByTimeAsync(INTERVALO_ESTADO_VIDEO_MS));
		expect(
			await screen.findByRole("link", { name: /Abrir video/ }),
		).toHaveAttribute("href", enlace);
		expect(cuerpos).toEqual([{ conversacion_id: id }]);
		expect(
			screen.queryByText("Esperando el video de D-ID…"),
		).not.toBeInTheDocument();
	});
});
