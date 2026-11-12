import { useState } from "react";
import { Icono } from "../compartido/componentes/Icono";

/**
 * Acceso simulado del panel: los mismos dos pasos del panel real (contraseña
 * con verificación antibots y código de la app autenticadora), pero sin
 * comprobar nada. En la etapa 3 lo reemplaza Supabase Auth con Turnstile y
 * segundo paso (PROP-01, PROP-02).
 */
export function AccesoDemo({ onEntrar }: { onEntrar: () => void }) {
	const [paso, setPaso] = useState<"clave" | "codigo">("clave");
	const [correo, setCorreo] = useState("");
	const [clave, setClave] = useState("");
	const [robot, setRobot] = useState(false);
	const [codigo, setCodigo] = useState("");
	const [error, setError] = useState<string | null>(null);

	function entrar() {
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo.trim()) || !clave) {
			setError("Escribe tu correo y tu contraseña.");
			return;
		}
		if (!robot) {
			setError("Confirma la verificación antibots.");
			return;
		}
		setError(null);
		setPaso("codigo");
	}

	function verificar() {
		if (!/^\d{6}$/.test(codigo)) {
			setError("Escribe los 6 dígitos de tu app autenticadora.");
			return;
		}
		setError(null);
		onEntrar();
	}

	return (
		<main className="panel-acceso" id="contenido">
			<img
				className="panel-acceso-logo"
				src="/marca/logo-vertical-court-bouillon.svg"
				alt="Fresura"
				width="200"
				height="97"
			/>
			<form
				className="panel-tarjeta"
				noValidate
				onSubmit={(e) => {
					e.preventDefault();
					if (paso === "clave") entrar();
					else verificar();
				}}
			>
				<p className="panel-demo-etiqueta">Modo demostración</p>
				{paso === "clave" ? (
					<>
						<h1>
							Panel de <em>Fresura</em>
						</h1>
						<p className="chico">
							Es una demostración: sirve cualquier correo y contraseña.
						</p>
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
						<label className="panel-antibots">
							<input
								type="checkbox"
								checked={robot}
								onChange={(e) => setRobot(e.target.checked)}
							/>
							<span>
								Confirmo que no soy un robot
								<span className="chico">
									{" "}
									(aquí irá la verificación de Cloudflare)
								</span>
							</span>
						</label>
					</>
				) : (
					<>
						<h1>
							Escribe tu <em>código</em>
						</h1>
						<p className="chico">
							Abre tu app autenticadora y escribe el código de 6 dígitos. En la
							demostración sirve cualquiera.
						</p>
						<div className="campo">
							<label htmlFor="a-codigo">Código de 6 dígitos</label>
							<input
								id="a-codigo"
								inputMode="numeric"
								autoComplete="one-time-code"
								maxLength={6}
								value={codigo}
								onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
							/>
						</div>
					</>
				)}
				{error && (
					<p className="alerta" role="alert">
						<Icono nombre="alerta" />
						<span>{error}</span>
					</p>
				)}
				<button type="submit" className="boton ancho">
					{paso === "clave" ? "Entrar" : "Verificar"}
				</button>
			</form>
		</main>
	);
}
