import { describe, expect, it } from "vitest";
import {
	fechaColombia,
	promocionesVigentes,
} from "../src/compartido/contenido/vigencia";

const promo = (desde: string, hasta: string) => ({
	id: `${desde}-${hasta}`,
	titulo: "Promo",
	productos: ["x"],
	vigencia: { desde, hasta },
	condiciones: "—",
});

describe("vigencia de las promociones (hora de Colombia)", () => {
	it("usa la fecha de Colombia (UTC-5), no la UTC", () => {
		expect(fechaColombia(new Date("2026-11-17T03:00:00Z"))).toBe("2026-11-16");
		expect(fechaColombia(new Date("2026-11-17T06:00:00Z"))).toBe("2026-11-17");
	});

	it("incluye los días de inicio y fin y excluye lo vencido o futuro", () => {
		const promociones = [
			promo("2026-11-16", "2026-11-16"),
			promo("2026-11-01", "2026-11-15"),
			promo("2026-11-17", "2026-11-30"),
			promo("2026-11-10", "2026-11-20"),
		];
		expect(
			promocionesVigentes(promociones, "2026-11-16").map((p) => p.id),
		).toEqual(["2026-11-16-2026-11-16", "2026-11-10-2026-11-20"]);
	});
});
