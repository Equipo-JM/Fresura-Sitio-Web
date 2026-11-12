import { describe, expect, it, vi } from "vitest";
import {
	clasificarErrorProveedor,
	ErrorIa,
	generarGuion,
	type LlamarModelo,
	type RespuestaModelo,
} from "../supabase/functions/ia/generar";
import { guionDePrueba } from "./datos/guion";

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

	it("nunca hace más de dos llamadas", async () => {
		const llamar = proveedor(incompleto, cupoDiario);
		expect(await codigoDeError(generar(llamar))).toBe("ia_cupo");
		expect(llamar).toHaveBeenCalledTimes(2);
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
