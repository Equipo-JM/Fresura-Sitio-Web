import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { type EstadoAcceso, estadoAcceso } from "./estadoAcceso";

/**
 * Sigue la sesión del panel en Supabase Auth y dice qué pantalla del acceso
 * toca. Se actualiza sola al entrar, al verificar el código, al renovar el
 * token y al salir. `refrescar` vuelve a consultar tras un paso del acceso.
 */
export function useSesionPanel(cliente: SupabaseClient) {
	const [estado, setEstado] = useState<EstadoAcceso | "cargando">("cargando");

	const refrescar = useCallback(async () => {
		const { data: sesion } = await cliente.auth.getSession();
		if (!sesion.session) {
			setEstado("sin-sesion");
			return;
		}
		const [{ data: nivel }, { data: factores }] = await Promise.all([
			cliente.auth.mfa.getAuthenticatorAssuranceLevel(),
			cliente.auth.mfa.listFactors(),
		]);
		setEstado(
			estadoAcceso({
				haySesion: true,
				nivel: nivel?.currentLevel ?? null,
				factoresVerificados: factores?.totp.length ?? 0,
				rol: sesion.session.user.app_metadata?.rol,
			}),
		);
	}, [cliente]);

	useEffect(() => {
		void refrescar();
		const { data } = cliente.auth.onAuthStateChange(() => {
			// No se llama a Supabase dentro del aviso: puede bloquear el cliente.
			setTimeout(() => void refrescar(), 0);
		});
		return () => data.subscription.unsubscribe();
	}, [cliente, refrescar]);

	return { estado, refrescar };
}
