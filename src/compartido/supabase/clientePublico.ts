import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../tipos/database.types";

let clientePublico: SupabaseClient<Database> | undefined;

/**
 * Cliente de Supabase para el sitio público: rol `anon` y sin sesión guardada,
 * separado del cliente del panel para que una sesión de administrador
 * incompleta nunca afecte al visitante (DD-24).
 *
 * @throws si faltan `VITE_SUPABASE_URL` o `VITE_SUPABASE_PUBLISHABLE_KEY`;
 * quien lee el contenido lo trata como un fallo y usa el respaldo.
 */
export function obtenerClientePublico(): SupabaseClient<Database> {
	if (clientePublico) return clientePublico;
	const url = import.meta.env.VITE_SUPABASE_URL;
	const clavePublicable = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
	if (!url || !clavePublicable) {
		throw new Error(
			"Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en el entorno",
		);
	}
	clientePublico = createClient<Database>(url, clavePublicable, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false,
		},
	});
	return clientePublico;
}
