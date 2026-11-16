import type { SupabaseClient } from "@supabase/supabase-js";
import { useRef, useState } from "react";
import { Icono } from "../../compartido/componentes/Icono";
import { useTurnstile } from "../../compartido/turnstile/useTurnstile";
import { MENSAJE_ACCESO_FALLIDO } from "./estadoAcceso";
import { MarcoAcceso } from "./MarcoAcceso";

/**
 * Primer paso (IF-02): correo, contraseña y Turnstile. Supabase Auth verifica
 * el token de Turnstile; el error es siempre el mismo mensaje genérico.
 */
export function PantallaEntrar({ cliente }: { cliente: SupabaseClient }) {
	const contenedorTurnstile = useRef<HTMLDivElement>(null);
	const turnstile = useTurnstile(contenedorTurnstile);
	const [correo, setCorreo] = useState("");
	const [clave, setClave] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [enviando, setEnviando] = useState(false);

	async function entrar() {
		if (!correo.trim() || !clave) {
			setError("Escribe tu correo y tu contraseña.");
			return;
		}
		if (!turnstile.token) {
			setError("Espera a que termine la verificación antibots.");
			return;
		}
		setEnviando(true);
		setError(null);
		const { error: fallo } = await cliente.auth.signInWithPassword({
			email: correo.trim(),
			password: clave,
			options: { captchaToken: turnstile.token },
		});
		setEnviando(false);
		if (fallo) {
			setError(MENSAJE_ACCESO_FALLIDO);
			// El token ya se usó: hace falta uno nuevo para el siguiente intento.
			turnstile.reiniciar();
		}
		// Si entró, el cambio de sesión lleva al segundo paso.
	}

	return (
		<MarcoAcceso
			titulo={
				<>
					Panel de <em>Fresura</em>
				</>
			}
			onEnviar={entrar}
		>
			<div className="campo">
				<label htmlFor="a-correo">Correo</label>
				<input
					id="a-correo"
					type="email"
					autoComplete="username"
					value={correo}
					onChange={(e) => setCorreo(e.target.value)}
				/>
			</div>
			<div className="campo">
				<label htmlFor="a-clave">Contraseña</label>
				<input
					id="a-clave"
					type="password"
					autoComplete="current-password"
					value={clave}
					onChange={(e) => setClave(e.target.value)}
				/>
			</div>
			<div className="panel-turnstile" ref={contenedorTurnstile} />
			{turnstile.fallo && (
				<p className="chico">
					La verificación antibots no se completó. Vuelve a intentarlo; si sigue
					fallando, recarga la página o prueba con otro navegador.
				</p>
			)}
			{error && (
				<p className="alerta" role="alert">
					<Icono nombre="alerta" />
					<span>{error}</span>
				</p>
			)}
			<button type="submit" className="boton ancho" disabled={enviando}>
				{enviando ? "Entrando…" : "Entrar"}
			</button>
		</MarcoAcceso>
	);
}
