import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../tipos/database.types";

let clientePanel: SupabaseClient<Database> | undefined;

/**
 * Cliente de Supabase del panel: guarda la sesión del administrador en el
 * navegador y la renueva sola. Va separado del cliente público, que no guarda
 * sesión, para que una sesión de administrador incompleta nunca afecte al
 * visitante (DD-24).
 *
 * @throws si faltan `VITE_SUPABASE_URL` o `VITE_SUPABASE_PUBLISHABLE_KEY`.
 */
export function obtenerClientePanel(): SupabaseClient<Database> {
	if (clientePanel) return clientePanel;
	const url = import.meta.env.VITE_SUPABASE_URL;
	const clavePublicable = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
	if (!url || !clavePublicable) {
		throw new Error(
			"Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en el entorno",
		);
	}
	clientePanel = createClient<Database>(url, clavePublicable, {
		auth: {
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: false,
			// Clave propia: no comparte la sesión con ningún otro cliente.
			storageKey: "fresura-panel-sesion",
		},
	});
	return clientePanel;
}

/** Si el entorno tiene lo necesario para el panel real. */
export function panelConfigurado(): boolean {
	return Boolean(
		import.meta.env.VITE_SUPABASE_URL &&
			import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
	);
}
