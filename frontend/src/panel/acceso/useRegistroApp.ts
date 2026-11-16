import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";

/** Datos para registrar la app autenticadora: QR, clave para escribir a mano y factor. */
export type RegistroApp = {
	idFactor: string;
	qr: string;
	secreto: string;
};

/**
 * Prepara el registro de la app autenticadora (IF-15): borra los intentos
 * anteriores sin terminar y crea un factor TOTP nuevo, con su código QR.
 * Se hace una sola vez por pantalla, aunque React monte dos veces en desarrollo.
 */
export function useRegistroApp(cliente: SupabaseClient) {
	const [registro, setRegistro] = useState<RegistroApp | null>(null);
	const [error, setError] = useState<string | null>(null);
	const iniciado = useRef(false);

	useEffect(() => {
		if (iniciado.current) return;
		iniciado.current = true;
		void (async () => {
			const { data: factores } = await cliente.auth.mfa.listFactors();
			// Un registro a medias (se cerró la pestaña con el QR abierto) estorba al nuevo.
			for (const factor of factores?.all ?? []) {
				if (factor.status === "unverified") {
					await cliente.auth.mfa.unenroll({ factorId: factor.id });
				}
			}
			const { data, error: fallo } = await cliente.auth.mfa.enroll({
				factorType: "totp",
				friendlyName: `App autenticadora ${new Date().toISOString()}`,
			});
			if (fallo || !data) {
				setError("No pudimos preparar el código QR. Recarga la página.");
				return;
			}
			setRegistro({
				idFactor: data.id,
				qr: data.totp.qr_code,
				secreto: data.totp.secret,
			});
		})();
	}, [cliente]);

	return { registro, error };
}

/**
 * Comprueba un código de la app contra un factor y, si vale, deja la sesión en
 * `aal2` (IF-03). Devuelve `true` si el código era correcto.
 */
export async function verificarCodigo(
	cliente: SupabaseClient,
	idFactor: string,
	codigo: string,
): Promise<boolean> {
	const { data: reto, error: falloReto } = await cliente.auth.mfa.challenge({
		factorId: idFactor,
	});
	if (falloReto || !reto) return false;
	const { error } = await cliente.auth.mfa.verify({
		factorId: idFactor,
		challengeId: reto.id,
		code: codigo,
	});
	return !error;
}

/** Id del factor TOTP ya verificado del usuario, para pedirle el código. */
export function useFactorVerificado(cliente: SupabaseClient): string | null {
	const [idFactor, setIdFactor] = useState<string | null>(null);
	useEffect(() => {
		let activo = true;
		void cliente.auth.mfa.listFactors().then(({ data }) => {
			if (activo) setIdFactor(data?.totp[0]?.id ?? null);
		});
		return () => {
			activo = false;
		};
	}, [cliente]);
	return idFactor;
}
