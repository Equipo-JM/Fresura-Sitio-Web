import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		environment: "jsdom",
		include: ["pruebas/**/*.test.{ts,tsx}"],
		setupFiles: ["./pruebas/preparacion.ts"],
	},
});
