import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Configuración del frontend. Los scripts de npm la usan con `vite frontend`,
// así que la raíz de Vite es esta carpeta y la compilación sale en `frontend/dist`.
export default defineConfig({
	plugins: [react()],
	// `.env.local` y `.env.example` siguen en la raíz del repositorio (DT-01, sección 26).
	envDir: "..",
	server: {
		fs: {
			// El sitio importa los esquemas Zod de `backend/supabase/functions/_shared`
			// (DD-33), que están fuera de esta carpeta. Se permite la raíz del repositorio;
			// Vite sigue negando los `.env` y las claves por su lista `fs.deny`.
			allow: [".."],
		},
	},
	test: {
		name: "frontend",
		environment: "jsdom",
		include: ["pruebas/**/*.test.{ts,tsx}"],
		setupFiles: ["./pruebas/preparacion.ts"],
	},
});
