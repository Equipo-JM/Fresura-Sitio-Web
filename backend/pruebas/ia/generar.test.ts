import { describe, expect, it, vi } from "vitest";
import {
	clasificarErrorProveedor,
	datosRegistroFallo,
	ErrorIa,
	estadoDelProveedor,
	generarGuion,
	generarSalida,
	type LlamarModelo,
	type RespuestaModelo,
} from "../../supabase/functions/ia/proveedor/generar";
import { guionDePrueba } from "../datos/guion";

const valido: RespuestaModelo = {
	texto: JSON.stringify(guionDePrueba()),
	bloqueado: false,
};
const incompleto: RespuestaModelo = {
	texto: '{"titulo":"x"}',
	bloqueado: false,
};

/** Error con la forma de `ApiError` de @google/genai. */
function errorApi(status: number, message: string) {
	return Object.assign(new Error(message), { status });
}

const cupoDiario = errorApi(
	429,
	"Quota exceeded. quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier",
);
const limiteMinuto = errorApi(
	429,
	"Quota exceeded. quotaId: GenerateRequestsPerMinutePerProjectPerModel-FreeTier",
);

const saturado = errorApi(503, "The model is overloaded. UNAVAILABLE");

/** Simula el proveedor con una respuesta (o un error) por llamada. */
function proveedor(...pasos: (RespuestaModelo | Error)[]) {
	return vi.fn<LlamarModelo>(async () => {
		const paso = pasos.shift();
		if (paso === undefined) throw new Error("Llamada no esperada");
		if (paso instanceof Error) throw paso;
		return paso;
	});
}

function generar(llamar: LlamarModelo, esperaMs?: number) {
	return generarGuion({
		llamar,
		modeloPrincipal: "principal",
		modeloRespaldo: "respaldo",
		prompt: { sistema: "s", usuario: "u" },
		duracion: 15,
		esperaMs,
	});
}

async function codigoDeError(promesa: Promise<unknown>) {
	const error = await promesa.catch((e: unknown) => e);
	expect(error).toBeInstanceOf(ErrorIa);
	return (error as ErrorIa).codigo;
}

describe("generarGuion", () => {
	it("devuelve el guion y el modelo cuando la primera llamada funciona", async () => {
		const llamar = proveedor(valido);
		await expect(generar(llamar)).resolves.toEqual({
			guion: guionDePrueba(),
			modelo: "principal",
		});
		expect(llamar).toHaveBeenCalledTimes(1);
	});

	it("PU-09: reintenta una vez con el mismo modelo si falla la estructura", async () => {
		const llamar = proveedor(incompleto, valido);
		await expect(generar(llamar)).resolves.toMatchObject({
			modelo: "principal",
		});
		expect(llamar.mock.calls.map(([p]) => p.modelo)).toEqual([
			"principal",
			"principal",
		]);
	});

	it("PU-09: da ia_estructura si falla dos veces", async () => {
		const llamar = proveedor(
			{ texto: "no es json", bloqueado: false },
			incompleto,
		);
		expect(await codigoDeError(generar(llamar))).toBe("ia_estructura");
		expect(llamar).toHaveBeenCalledTimes(2);
	});

	it("PI-05: con el cupo diario agotado usa el modelo de respaldo", async () => {
		const llamar = proveedor(cupoDiario, valido);
		await expect(generar(llamar)).resolves.toMatchObject({
			modelo: "respaldo",
		});
	});

	it("PI-05: da ia_cupo si el respaldo también está agotado", async () => {
		const llamar = proveedor(cupoDiario, cupoDiario);
		expect(await codigoDeError(generar(llamar))).toBe("ia_cupo");
	});

	it("no reintenta el límite por minuto", async () => {
		const llamar = proveedor(limiteMinuto);
		expect(await codigoDeError(generar(llamar))).toBe("ia_limite_minuto");
		expect(llamar).toHaveBeenCalledTimes(1);
	});

	it("PI-05: da ia_bloqueado si el proveedor bloquea el contenido", async () => {
		const llamar = proveedor({ texto: undefined, bloqueado: true });
		expect(await codigoDeError(generar(llamar))).toBe("ia_bloqueado");
		expect(llamar).toHaveBeenCalledTimes(1);
	});

	it("PI-05: da ia_tiempo si el proveedor no responde a tiempo, sin reintentar", async () => {
		const llamar = vi.fn<LlamarModelo>(
			({ senal }) =>
				new Promise((_resolver, rechazar) => {
					senal.addEventListener("abort", () => rechazar(senal.reason));
				}),
		);
		expect(await codigoDeError(generar(llamar, 20))).toBe("ia_tiempo");
		expect(llamar).toHaveBeenCalledTimes(1);
	});

	it("PI-05: si el cupo se agota en el reintento por estructura, usa el respaldo", async () => {
		const llamar = proveedor(incompleto, cupoDiario, valido);
		const resultado = await generar(llamar);
		expect(resultado.modelo).toBe("respaldo");
		expect(llamar.mock.calls.map(([p]) => p.modelo)).toEqual([
			"principal",
			"principal",
			"respaldo",
		]);
	});

	it("nunca hace más de tres llamadas, y la tercera solo es al respaldo", async () => {
		const llamar = proveedor(incompleto, cupoDiario, cupoDiario);
		expect(await codigoDeError(generar(llamar))).toBe("ia_cupo");
		expect(llamar).toHaveBeenCalledTimes(3);
	});

	it("no pasa al respaldo si el reintento falla por otra causa", async () => {
		const llamar = proveedor(incompleto, limiteMinuto);
		expect(await codigoDeError(generar(llamar))).toBe("ia_limite_minuto");
		expect(llamar).toHaveBeenCalledTimes(2);
	});

	it("NT-06: si el principal está saturado (503) usa una vez el respaldo", async () => {
		const llamar = proveedor(saturado, valido);
		await expect(generar(llamar)).resolves.toMatchObject({
			modelo: "respaldo",
		});
		expect(llamar.mock.calls.map(([p]) => p.modelo)).toEqual([
			"principal",
			"respaldo",
		]);
	});

	it("NT-06: da ia_tiempo con el estado 503 si el respaldo también está saturado", async () => {
		const llamar = proveedor(saturado, saturado);
		const error = await generar(llamar).catch((e: unknown) => e);
		expect(error).toBeInstanceOf(ErrorIa);
		expect(error).toMatchObject({ codigo: "ia_tiempo", estadoProveedor: 503 });
		expect(llamar).toHaveBeenCalledTimes(2);
	});

	it("NT-06: si el principal se satura en el reintento por estructura, usa el respaldo", async () => {
		const llamar = proveedor(incompleto, saturado, valido);
		await expect(generar(llamar)).resolves.toMatchObject({
			modelo: "respaldo",
		});
		expect(llamar).toHaveBeenCalledTimes(3);
	});

	it.each([
		[500, "Internal"],
		[400, "Bad request"],
		[404, "Not found"],
	])(
		"no pasa al respaldo con un error %i y conserva el estado",
		async (estado, mensaje) => {
			const llamar = proveedor(errorApi(estado, mensaje));
			const error = await generar(llamar).catch((e: unknown) => e);
			expect(error).toMatchObject({
				codigo: "ia_tiempo",
				estadoProveedor: estado,
			});
			expect(llamar).toHaveBeenCalledTimes(1);
		},
	);

	it("un tiempo agotado no lleva estado del proveedor", async () => {
		const llamar = vi.fn<LlamarModelo>(
			({ senal }) =>
				new Promise((_resolver, rechazar) => {
					senal.addEventListener("abort", () => rechazar(senal.reason));
				}),
		);
		const error = await generar(llamar, 20).catch((e: unknown) => e);
		expect(error).toMatchObject({ codigo: "ia_tiempo" });
		expect((error as ErrorIa).estadoProveedor).toBeUndefined();
	});
});

describe("estadoDelProveedor", () => {
	it.each([
		[saturado, 503],
		[errorApi(400, "x"), 400],
		[new TypeError("fetch failed"), undefined],
		[{ status: "503" }, undefined],
		[undefined, undefined],
	])("%s → %s", (error, estado) => {
		expect(estadoDelProveedor(error)).toBe(estado);
	});
});

describe("datosRegistroFallo", () => {
	it("DD-20: lleva fecha, tipo y estado del proveedor, sin el mensaje", () => {
		const datos = datosRegistroFallo(
			"ia_tiempo",
			503,
			new Date("2026-11-16T15:00:00Z"),
		);
		expect(datos).toEqual({
			fecha: "2026-11-16T15:00:00.000Z",
			tipo: "ia_tiempo",
			estado_proveedor: 503,
		});
	});

	it("omite el estado cuando no lo hay", () => {
		expect(datosRegistroFallo("ia_tiempo", undefined, new Date(0))).toEqual({
			fecha: "1970-01-01T00:00:00.000Z",
			tipo: "ia_tiempo",
		});
	});
});

describe("clasificarErrorProveedor", () => {
	it.each([
		[cupoDiario, "ia_cupo"],
		[limiteMinuto, "ia_limite_minuto"],
		[errorApi(500, "Internal"), "ia_tiempo"],
		[errorApi(503, "Unavailable"), "ia_tiempo"],
		[new TypeError("fetch failed"), "ia_tiempo"],
	])("%s → %s", (error, codigo) => {
		expect(clasificarErrorProveedor(error)).toBe(codigo);
	});
});

describe("reintento por estructura con aviso", () => {
	type Salida = { total: number };
	const validarTotal = (datos: unknown) => {
		const total = (datos as Salida | undefined)?.total;
		return typeof total === "number" && total <= 300
			? { success: true as const, data: { total } }
			: {
					success: false as const,
					error: {
						issues: [
							{
								path: ["escenas"],
								message: `El texto hablado suma ${total} caracteres y el máximo es 300`,
							},
						],
					},
				};
	};
	const respuesta = (datos: unknown): RespuestaModelo => ({
		texto: JSON.stringify(datos),
		bloqueado: false,
	});
	function salida(llamar: LlamarModelo) {
		return generarSalida<Salida>({
			llamar,
			modeloPrincipal: "principal",
			modeloRespaldo: "respaldo",
			prompt: { sistema: "s", usuario: "u" },
			esquemaJson: {},
			validar: validarTotal,
		});
	}

	it("el reintento le dice al modelo qué regla no cumplió", async () => {
		const llamar = proveedor(
			respuesta({ total: 355 }),
			respuesta({ total: 250 }),
		);
		await expect(salida(llamar)).resolves.toEqual({
			salida: { total: 250 },
			modelo: "principal",
		});
		const [primera, segunda] = llamar.mock.calls.map(([p]) => p.prompt);
		expect(primera).toEqual({ sistema: "s", usuario: "u" });
		expect(segunda.sistema).toBe("s");
		expect(segunda.usuario).toMatch(/^u\n\n/);
		expect(segunda.usuario).toContain(
			"- escenas: El texto hablado suma 355 caracteres y el máximo es 300",
		);
	});

	it("si la respuesta no es JSON, el aviso lo dice", async () => {
		const llamar = proveedor(
			{ texto: "no es json", bloqueado: false },
			respuesta({ total: 10 }),
		);
		await salida(llamar);
		expect(llamar.mock.calls[1][0].prompt.usuario).toContain("JSON");
	});

	it("el respaldo tras el reintento también recibe el aviso", async () => {
		const llamar = proveedor(
			respuesta({ total: 400 }),
			cupoDiario,
			respuesta({ total: 100 }),
		);
		await expect(salida(llamar)).resolves.toMatchObject({ modelo: "respaldo" });
		expect(llamar.mock.calls[2][0].prompt.usuario).toContain("suma 400");
	});

	it("da ia_estructura si el reintento con aviso tampoco cumple", async () => {
		const llamar = proveedor(
			respuesta({ total: 400 }),
			respuesta({ total: 350 }),
		);
		expect(await codigoDeError(salida(llamar))).toBe("ia_estructura");
		expect(llamar).toHaveBeenCalledTimes(2);
	});
});
