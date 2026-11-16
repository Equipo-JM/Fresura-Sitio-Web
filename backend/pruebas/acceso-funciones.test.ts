import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
	type ClaimsSesion,
	comprobarAdministrador,
	crearVerificadorJwt,
} from "../supabase/functions/_shared/acceso";
import {
	cabecerasCors,
	leerOrigenesPermitidos,
} from "../supabase/functions/_shared/http";

/** Simula la verificación del JWT: el token "valido-<caso>" devuelve esos datos. */
function verificador(casos: Record<string, ClaimsSesion>) {
	return async (jwt: string) => casos[jwt] ?? null;
}

const verificar = verificador({
	"sin-rol": { sub: "u1", aal: "aal2", app_metadata: {} },
	"admin-aal1": { sub: "u2", aal: "aal1", app_metadata: { rol: "admin" } },
	"admin-aal2": { sub: "u3", aal: "aal2", app_metadata: { rol: "admin" } },
});

describe("PI-03 (lógica): acceso a las funciones", () => {
	it.each([
		["sin cabecera", null, 401],
		["cabecera sin Bearer", "admin-aal2", 401],
		["token inválido", "Bearer otro", 401],
		["sesión sin rol", "Bearer sin-rol", 403],
		["admin sin segundo paso", "Bearer admin-aal1", 403],
	])("rechaza %s", async (_caso, cabecera, estado) => {
		await expect(comprobarAdministrador(cabecera, verificar)).resolves.toEqual({
			permitido: false,
			estado,
		});
	});

	it("permite al admin con segundo paso", async () => {
		await expect(
			comprobarAdministrador("Bearer admin-aal2", verificar),
		).resolves.toEqual({ permitido: true, usuario: "u3", jwt: "admin-aal2" });
	});
});

describe("crearVerificadorJwt", () => {
	it("trata un token mal formado como inválido, sin lanzar", async () => {
		const cliente = createClient(
			"https://ejemplo.supabase.co",
			"sb_publishable_ejemplo",
			{ auth: { persistSession: false, autoRefreshToken: false } },
		);
		const verificar = crearVerificadorJwt(cliente, { keys: [] });
		await expect(verificar("abc.def.ghi")).resolves.toBeNull();
	});
});

describe("orígenes permitidos", () => {
	const permitidos = leerOrigenesPermitidos(
		" http://localhost:5173 , https://fresura.example ,",
	);

	it("lee la lista separada por comas, sin espacios ni vacíos", () => {
		expect(permitidos).toEqual([
			"http://localhost:5173",
			"https://fresura.example",
		]);
	});

	it("solo da cabeceras a un origen permitido", () => {
		expect(
			cabecerasCors("http://localhost:5173", permitidos)?.[
				"Access-Control-Allow-Origin"
			],
		).toBe("http://localhost:5173");
		expect(cabecerasCors("https://otro.example", permitidos)).toBeNull();
		expect(cabecerasCors(null, permitidos)).toBeNull();
	});
});
