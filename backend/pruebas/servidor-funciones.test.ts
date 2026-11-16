import { describe, expect, it, vi } from "vitest";
import type { VerificarJwt } from "../supabase/functions/_shared/acceso";
import { crearLectorEntorno } from "../supabase/functions/_shared/entorno";
import { leerCuerpoJson } from "../supabase/functions/_shared/http";
import {
	crearServidor,
	type ManejadorRuta,
} from "../supabase/functions/_shared/servidor";

const ORIGEN = "http://localhost:5173";

const verificar: VerificarJwt = async (jwt) => {
	if (jwt === "admin")
		return { sub: "u1", aal: "aal2", app_metadata: { rol: "admin" } };
	if (jwt === "sin-segundo-paso")
		return { sub: "u1", aal: "aal1", app_metadata: { rol: "admin" } };
	return null;
};

function servidor(
	ruta: ManejadorRuta = async ({ cors }) =>
		new Response("ok", { headers: cors }),
) {
	const registrarFallo = vi.fn();
	const atender = crearServidor({
		origenesPermitidos: [ORIGEN],
		verificarJwt: verificar,
		rutas: { publicar: ruta },
		mensajeSinPermiso: "sin permiso",
		mensajeErrorInterno: "error interno",
		registrarFallo,
	});
	return { atender, registrarFallo };
}

function peticion(
	ruta: string,
	{
		metodo = "POST",
		origen = ORIGEN,
		token,
	}: { metodo?: string; origen?: string | null; token?: string } = {},
) {
	const cabeceras = new Headers();
	if (origen) cabeceras.set("Origin", origen);
	if (token) cabeceras.set("Authorization", `Bearer ${token}`);
	return new Request(`https://x.supabase.co/functions/v1/panel/${ruta}`, {
		method: metodo,
		headers: cabeceras,
	});
}

describe("crearServidor (PI-03, lógica común de panel e ia)", () => {
	it("rechaza un origen no permitido sin cabeceras CORS", async () => {
		const respuesta = await servidor().atender(
			peticion("publicar", { origen: "https://otro.com", token: "admin" }),
		);
		expect(respuesta.status).toBe(403);
		expect(respuesta.headers.get("Access-Control-Allow-Origin")).toBeNull();
	});

	it("responde la consulta previa con 204", async () => {
		const respuesta = await servidor().atender(
			peticion("publicar", { metodo: "OPTIONS" }),
		);
		expect(respuesta.status).toBe(204);
		expect(respuesta.headers.get("Access-Control-Allow-Origin")).toBe(ORIGEN);
	});

	it("da 404 a una ruta que no existe, también a nombres heredados como toString", async () => {
		const { atender } = servidor();
		expect((await atender(peticion("otra", { token: "admin" }))).status).toBe(
			404,
		);
		expect(
			(await atender(peticion("toString", { token: "admin" }))).status,
		).toBe(404);
	});

	it("da 401 sin token y 403 sin segundo paso", async () => {
		const { atender } = servidor();
		expect((await atender(peticion("publicar"))).status).toBe(401);
		expect(
			(await atender(peticion("publicar", { token: "sin-segundo-paso" })))
				.status,
		).toBe(403);
	});

	it("atiende la ruta al administrador con segundo paso", async () => {
		const ruta = vi.fn<ManejadorRuta>(
			async ({ cors }) => new Response("ok", { headers: cors }),
		);
		const respuesta = await servidor(ruta).atender(
			peticion("publicar", { token: "admin" }),
		);
		expect(respuesta.status).toBe(200);
		expect(ruta.mock.calls[0][0]).toMatchObject({
			jwt: "admin",
			usuario: "u1",
		});
	});

	it("convierte un error no previsto en 500 genérico y registra solo su tipo", async () => {
		const { atender, registrarFallo } = servidor(async () => {
			throw new Error("lectura_contenido");
		});
		const respuesta = await atender(peticion("publicar", { token: "admin" }));
		expect(respuesta.status).toBe(500);
		expect(await respuesta.json()).toEqual({
			error: "error_interno",
			mensaje: "error interno",
		});
		expect(registrarFallo).toHaveBeenCalledWith("lectura_contenido");
	});
});

describe("leerCuerpoJson", () => {
	const conCuerpo = (cuerpo: string) =>
		new Request("https://x", { method: "POST", body: cuerpo });

	it("lee un JSON válido", async () => {
		expect(await leerCuerpoJson(conCuerpo('{"a":1}'))).toEqual({
			valido: true,
			datos: { a: 1 },
		});
	});

	it("rechaza lo que no es JSON", async () => {
		expect(await leerCuerpoJson(conCuerpo("hola"))).toEqual({
			valido: false,
			motivo: "no_es_json",
		});
	});

	it("rechaza un cuerpo más grande que el máximo", async () => {
		expect(await leerCuerpoJson(conCuerpo("x".repeat(20)), 10)).toEqual({
			valido: false,
			motivo: "demasiado_grande",
		});
	});
});

describe("crearLectorEntorno", () => {
	const variables: Record<string, string> = {
		URL: "https://x.supabase.co",
		CLAVES: '{"default":"sb_publishable_x"}',
		SIN_DEFAULT: '{"otra":"y"}',
		ROTO: "{",
	};
	const entorno = crearLectorEntorno((nombre) => variables[nombre]);

	it("lee las obligatorias y avisa cuando faltan", () => {
		expect(entorno.obligatoria("URL")).toBe("https://x.supabase.co");
		expect(() => entorno.obligatoria("FALTA")).toThrow(
			"Falta la variable FALTA",
		);
		expect(entorno.opcional("FALTA")).toBeUndefined();
	});

	it("saca la clave default del diccionario de claves de Supabase", () => {
		expect(entorno.clavePorDefecto("CLAVES")).toBe("sb_publishable_x");
		expect(() => entorno.clavePorDefecto("SIN_DEFAULT")).toThrow(
			'clave "default"',
		);
		expect(() => entorno.json("ROTO")).toThrow("no es JSON válido");
	});
});
