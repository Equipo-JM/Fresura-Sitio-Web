import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../supabase/functions/ia/proveedor/gemini.ts", () => ({
	crearLlamadaGemini: () => async () => {
		throw new Error("Llamada inesperada a Gemini");
	},
}));

afterEach(() => {
	vi.unstubAllGlobals();
	vi.resetModules();
});

describe("acceso a las rutas de IA", () => {
	it.each([
		{ caso: "sin token", token: null },
		{ caso: "con token inválido", token: "invalido" },
	])(
		"rechaza $caso antes de consultar datos o proveedores",
		async ({ token }) => {
			const origen = "https://fresura.invalid";
			const variables: Record<string, string> = {
				SUPABASE_URL: "https://supabase.invalid",
				ORIGENES_PERMITIDOS: origen,
				SUPABASE_PUBLISHABLE_KEYS: '{"default":"publica-ficticia"}',
				SUPABASE_SECRET_KEYS: '{"default":"privada-ficticia"}',
				SUPABASE_JWKS: '{"keys":[]}',
				IA_MODELO: "principal",
				IA_MODELO_RESPALDO: "respaldo",
				GEMINI_API_KEY: "gemini-ficticia",
				DID_API_KEY: "did:ficticia",
				DID_AVATAR_IMAGE_URL: "https://fresura.invalid/avatar.jpg",
				DID_VOICE_ID: "voz-ficticia",
			};
			const servir =
				vi.fn<(atender: (peticion: Request) => Promise<Response>) => void>();
			vi.stubGlobal("Deno", {
				env: { get: (nombre: string) => variables[nombre] },
				serve: servir,
			});
			const red = vi
				.fn<typeof fetch>()
				.mockRejectedValue(new Error("Red inesperada"));
			vi.stubGlobal("fetch", red);
			// El punto de entrada se comprueba en Deno, fuera del proyecto TS de Vitest.
			const modulo = "../../supabase/functions/ia/index.ts";
			await import(modulo);
			const atender = servir.mock.calls[0]?.[0];
			if (!atender) throw new Error("No se conectó Deno.serve");

			const cabeceras = new Headers({ Origin: origen });
			if (token) cabeceras.set("Authorization", `Bearer ${token}`);
			for (const ruta of ["chat", "guion", "prompt-video"]) {
				const respuesta = await atender(
					new Request(`https://supabase.invalid/functions/v1/ia/${ruta}`, {
						method: "POST",
						headers: cabeceras,
						body: JSON.stringify({ mensaje: "confirmar video" }),
					}),
				);
				expect(respuesta.status, ruta).toBe(401);
				expect(await respuesta.json()).toMatchObject({ error: "sin_sesion" });
			}
			expect(red).not.toHaveBeenCalled();
		},
	);
});
