import { defineConfig } from "vitest/config";

// `npm test` ejecuta las pruebas de las dos partes; cada una tiene su configuración.
export default defineConfig({
	test: {
		projects: ["frontend/vite.config.ts", "backend/vitest.config.ts"],
	},
});
