import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../supabase/functions/_shared/acceso.ts", async (importarOriginal) => {
	const original =
		await importarOriginal<
			typeof import("../supabase/functions/_shared/acceso.ts")
		>();
	return {
		...original,
		crearVerificadorJwt: () => async () => ({
			sub: "11111111-1111-4111-8111-111111111111",
			aal: "aal2",
			app_metadata: { rol: "admin" },
		}),
	};
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	vi.resetModules();
});

describe("conexión de panel/index.ts", () => {
	it("usa la clave default y registra solo fecha y tipo en ambas rutas", async () => {
		const clave = "sb_secret_ficticia_default_panel";
		const otraClave = "sb_secret_ficticia_no_usar";
		const variables: Record<string, string> = {
			SUPABASE_URL: "https://prueba.supabase.co",
			SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({
				default: "sb_publishable_ficticia",
			}),
			SUPABASE_SECRET_KEYS: JSON.stringify({ otra: otraClave, default: clave }),
			SUPABASE_JWKS: '{"keys":[]}',
			ORIGENES_PERMITIDOS: "http://localhost:5173",
		};
		let atender: ((peticion: Request) => Promise<Response>) | undefined;
		vi.stubGlobal("Deno", {
			env: { get: (nombre: string) => variables[nombre] },
			serve: (manejador: typeof atender) => {
				atender = manejador;
			},
		});
		const solicitudes: Request[] = [];
		vi.stubGlobal(
			"fetch",
			async (url: string | URL | Request, opciones?: RequestInit) => {
				solicitudes.push(new Request(url, opciones));
				return new Response(
					JSON.stringify({
						code: "XX000",
						message: clave,
						details: "contenido privado",
					}),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					},
				);
			},
		);
		const registro = vi.spyOn(console, "error").mockImplementation(() => {});
		const modulo = "../supabase/functions/panel/index.ts";
		await import(modulo);
		if (!atender) throw new Error("No se conectó Deno.serve");
		for (const ruta of ["publicar", "restaurar"]) {
			const respuesta = await atender(
				new Request(`https://prueba.supabase.co/functions/v1/panel/${ruta}`, {
					method: "POST",
					headers: {
						Origin: "http://localhost:5173",
						Authorization: "Bearer admin",
					},
					body: JSON.stringify(
						ruta === "publicar" ? { revision: 1, contenido_real: false } : {},
					),
				}),
			);
			expect(respuesta.status).toBe(500);
			expect(await respuesta.json()).toEqual({
				error: "error_interno",
				mensaje: "No se pudo publicar. El sitio sigue igual.",
			});
		}
		expect(solicitudes).toHaveLength(2);
		for (const peticion of solicitudes) {
			expect(peticion.headers.get("apikey")).toBe(clave);
			expect(peticion.headers.get("Authorization")).not.toBe("Bearer admin");
		}
		expect(registro).toHaveBeenCalledTimes(2);
		for (const [indice, llamada] of registro.mock.calls.entries()) {
			const datos: unknown = JSON.parse(String(llamada[0]));
			expect(datos).toEqual({
				fecha: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
				tipo: indice === 0 ? "publicacion" : "restauracion",
			});
		}
		expect(JSON.stringify(registro.mock.calls)).not.toContain(clave);
		expect(JSON.stringify(registro.mock.calls)).not.toContain(otraClave);
		expect(JSON.stringify(registro.mock.calls)).not.toContain(
			"contenido privado",
		);
	});
});
