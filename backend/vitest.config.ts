import { defineConfig } from "vitest/config";

// Pruebas del backend: lógica de las funciones `panel` e `ia` y esquemas Zod.
// Corren en Node con Vitest; las funciones se despliegan en Deno (DT-01, sección 2.1).
export default defineConfig({
	test: {
		name: "backend",
		environment: "node",
		include: ["pruebas/**/*.test.ts"],
	},
});
