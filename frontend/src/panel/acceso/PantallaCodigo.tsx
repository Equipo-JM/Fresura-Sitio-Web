import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { Icono } from "../../compartido/componentes/Icono";
import { MarcoAcceso } from "./MarcoAcceso";
import {
	useFactorVerificado,
	useRegistroApp,
	verificarCodigo,
} from "./useRegistroApp";

/**
 * Segundo paso. Con `registrar`, muestra el código QR para activar la app
 * autenticadora la primera vez (IF-15); si no, solo pide el código (IF-03).
 */
export function PantallaCodigo({
	cliente,
	registrar,
	onListo,
}: {
	cliente: SupabaseClient;
	registrar: boolean;
	onListo: () => void;
}) {
	return registrar ? (
		<RegistrarApp cliente={cliente} onListo={onListo} />
	) : (
		<PedirCodigo cliente={cliente} onListo={onListo} />
	);
}

function RegistrarApp({
	cliente,
	onListo,
}: {
	cliente: SupabaseClient;
	onListo: () => void;
}) {
	const { registro, error } = useRegistroApp(cliente);
	return (
		<MarcoAcceso
			titulo={
				<>
					Activa tu <em>código</em>
				</>
			}
		>
			<p className="chico">
				Para proteger el panel, cada vez que entres te pediremos un código de tu
				celular. Abre tu app autenticadora (por ejemplo, Google Authenticator) y
				escanea este código.
			</p>
			{error && <Aviso texto={error} />}
			{registro ? (
				<>
					<img
						className="panel-qr"
						src={registro.qr}
						alt="Código QR para la app autenticadora"
						width="200"
						height="200"
					/>
					<details className="panel-secreto">
						<summary>¿No puedes escanearlo?</summary>
						<p className="chico">Escribe esta clave en la app:</p>
						<code>{registro.secreto}</code>
					</details>
					<CampoCodigo
						cliente={cliente}
						idFactor={registro.idFactor}
						onListo={onListo}
						boton="Activar y entrar"
					/>
				</>
			) : (
				!error && <p>Preparando el código QR…</p>
			)}
		</MarcoAcceso>
	);
}

function PedirCodigo({
	cliente,
	onListo,
}: {
	cliente: SupabaseClient;
	onListo: () => void;
}) {
	const idFactor = useFactorVerificado(cliente);
	return (
		<MarcoAcceso
			titulo={
				<>
					Escribe tu <em>código</em>
				</>
			}
		>
			<p className="chico">
				Abre tu app autenticadora y escribe el código de 6 dígitos.
			</p>
			{idFactor ? (
				<CampoCodigo
					cliente={cliente}
					idFactor={idFactor}
					onListo={onListo}
					boton="Verificar"
				/>
			) : (
				<p>Cargando…</p>
			)}
			<Salir cliente={cliente} />
		</MarcoAcceso>
	);
}

function CampoCodigo({
	cliente,
	idFactor,
	onListo,
	boton,
}: {
	cliente: SupabaseClient;
	idFactor: string;
	onListo: () => void;
	boton: string;
}) {
	const [codigo, setCodigo] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [enviando, setEnviando] = useState(false);

	async function verificar() {
		if (!/^\d{6}$/.test(codigo)) {
			setError("Escribe los 6 dígitos de tu app autenticadora.");
			return;
		}
		setEnviando(true);
		const valido = await verificarCodigo(cliente, idFactor, codigo);
		setEnviando(false);
		if (!valido) {
			setError(
				"Ese código no es válido. Revisa que sea el más reciente de la app.",
			);
			setCodigo("");
			return;
		}
		onListo();
	}

	return (
		<form
			className="panel-codigo"
			noValidate
			onSubmit={(e) => {
				e.preventDefault();
				void verificar();
			}}
		>
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
			{error && <Aviso texto={error} />}
			<button type="submit" className="boton ancho" disabled={enviando}>
				{enviando ? "Verificando…" : boton}
			</button>
		</form>
	);
}

/** Cierra la sesión del panel. */
export function Salir({ cliente }: { cliente: SupabaseClient }) {
	return (
		<button
			type="button"
			className="boton-texto"
			onClick={() => void cliente.auth.signOut()}
		>
			Salir
		</button>
	);
}

function Aviso({ texto }: { texto: string }) {
	return (
		<p className="alerta" role="alert">
			<Icono nombre="alerta" />
			<span>{texto}</span>
		</p>
	);
}
