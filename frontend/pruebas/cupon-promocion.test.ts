import { describe, expect, it } from "vitest";
import {
	avisoDias,
	diasRestantes,
	fechasLegibles,
	separarTitulo,
} from "../src/sitio/promociones/cupon";

describe("cupón de promoción", () => {
	it("escribe la vigencia en palabras", () => {
		expect(fechasLegibles("2026-11-20", "2026-11-30")).toBe(
			"Del 20 al 30 de noviembre",
		);
		expect(fechasLegibles("2026-11-15", "2026-12-15")).toBe(
			"Del 15 de noviembre al 15 de diciembre",
		);
		expect(fechasLegibles("2026-12-28", "2027-01-05")).toBe(
			"Del 28 de diciembre de 2026 al 5 de enero de 2027",
		);
		expect(fechasLegibles("2026-11-20", "2026-11-20")).toBe(
			"Solo el 20 de noviembre",
		);
	});

	it("cuenta los días que faltan, también al cambiar de mes y de año", () => {
		expect(diasRestantes("2026-11-30", "2026-11-22")).toBe(8);
		expect(diasRestantes("2026-12-15", "2026-11-22")).toBe(23);
		expect(diasRestantes("2027-01-02", "2026-12-31")).toBe(2);
		expect(diasRestantes("2026-11-22", "2026-11-22")).toBe(0);
	});

	it("marca como urgentes los últimos tres días", () => {
		expect(avisoDias(8)).toEqual({ texto: "Quedan 8 días", urgente: false });
		expect(avisoDias(3)).toEqual({ texto: "¡Últimos 3 días!", urgente: true });
		expect(avisoDias(1)).toEqual({ texto: "¡Termina mañana!", urgente: true });
		expect(avisoDias(0)).toEqual({ texto: "¡Último día!", urgente: true });
	});

	it("separa la oferta del resto del título", () => {
		expect(separarTitulo("2x1 en fresas con crema los martes")).toEqual({
			oferta: "2x1",
			resto: "en fresas con crema los martes",
		});
		expect(separarTitulo("Topping gratis en tu Fresita")).toEqual({
			oferta: "Topping gratis",
			resto: "en tu Fresita",
		});
	});

	it("deja el título entero si no hay una oferta corta al inicio", () => {
		expect(separarTitulo("Semana de la fresa")).toEqual({
			oferta: "Semana de la fresa",
			resto: "",
		});
		expect(
			separarTitulo("Celebra con nosotros el cumpleaños de Fresura en tienda"),
		).toEqual({
			oferta: "Celebra",
			resto: "con nosotros el cumpleaños de Fresura en tienda",
		});
	});
});
