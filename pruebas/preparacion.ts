import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Vitest carga el .env.local real: se reemplaza para que ninguna prueba llegue
// al Supabase del proyecto. El dominio .invalid nunca resuelve.
vi.stubEnv("VITE_SUPABASE_URL", "https://supabase-de-prueba.invalid");
vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_prueba");

afterEach(() => {
	cleanup();
});
