import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import type { Database } from "../../tipos/database.types";
import { EditorGuion } from "../guiones/EditorGuion";
import type { GuionGuardado } from "../guiones/servicioGuiones";
import { leerTarjeta } from "./servicioConversaciones";
import { useBorradoresAgente } from "./useBorradoresAgente";
import { useChatAgente } from "./useChatAgente";

/** Chat con historial y guardado explícito de los guiones. */
export function ChatAgente({
	cliente,
	abrirGuion,
	productos,
}: {
	cliente: SupabaseClient<Database>;
	abrirGuion: (fila: GuionGuardado) => void;
	productos: { id: string; nombre: string }[];
}) {
	const chat = useChatAgente(cliente);
	const borradores = useBorradoresAgente(cliente, abrirGuion, productos);
	const [texto, setTexto] = useState("");
	const [confirmacion, setConfirmacion] = useState<string | null>(null);
	const ultimo = chat.mensajes.at(-1);
	const consultando =
		ultimo?.role === "assistant" &&
		ultimo.parts.some(
			(p) =>
				(p.type.startsWith("tool-") || p.type === "dynamic-tool") &&
				"state" in p &&
				p.state !== "output-available" &&
				p.state !== "output-error",
		);
	const sinRespuesta =
		chat.estado === "listo" &&
		ultimo?.role === "assistant" &&
		!ultimo.parts.some((p) => p.type === "text" && p.text.trim()) &&
		!ultimo.metadata?.tarjetaGuion;
	function enviar() {
		if (chat.ocupado || !texto.trim()) return;
		void chat.enviar(texto);
		setTexto("");
	}
	return (
		<section className="panel-seccion" aria-labelledby="chat-titulo">
			<h2 id="chat-titulo">Conversar con el agente</h2>
			<div className="agente-distribucion">
				<nav aria-label="Conversaciones">
					<button
						className="boton secundario"
						type="button"
						disabled={chat.ocupado}
						onClick={chat.nuevaConversacion}
					>
						Nueva conversación
					</button>
					<ul className="guiones-lista">
						{chat.conversaciones.map((c) => (
							<li key={c.id}>
								<button
									className="boton-texto"
									type="button"
									aria-current={
										chat.conversacionActiva === c.id ? "true" : undefined
									}
									disabled={chat.ocupado}
									onClick={() => void chat.cambiarConversacion(c.id)}
								>
									{c.titulo}
								</button>
								<button
									className="boton-texto"
									type="button"
									aria-label={`Borrar ${c.titulo}`}
									disabled={chat.ocupado}
									onClick={() => setConfirmacion(c.id)}
								>
									Borrar
								</button>
								{confirmacion === c.id && (
									<fieldset aria-label="Confirmar borrado">
										<p>
											¿Borrar esta conversación y sus mensajes? No podrás
											recuperarlos.
										</p>
										<button
											className="boton secundario"
											type="button"
											disabled={chat.ocupado}
											onClick={() => {
												void chat.borrar(c.id);
												setConfirmacion(null);
											}}
										>
											Confirmar borrado
										</button>
										<button
											className="boton-texto"
											type="button"
											onClick={() => setConfirmacion(null)}
										>
											Cancelar
										</button>
									</fieldset>
								)}
							</li>
						))}
					</ul>
				</nav>
				<div className="agente-chat">
					<div
						role="log"
						aria-live="polite"
						aria-relevant="additions text"
						aria-label="Mensajes del agente"
					>
						{chat.mensajes.map((m) => {
							const tarjeta = leerTarjeta(m.metadata?.tarjetaGuion);
							return (
								<article className="panel-bloque agente-mensaje" key={m.id}>
									<strong>{m.role === "user" ? "Tú" : "Agente"}</strong>
									{m.parts
										.filter((p) => p.type === "text")
										.map((p) => (
											<p className="agente-texto" key={p.type + p.text}>
												{p.text}
											</p>
										))}
									{m.metadata?.aviso && (
										<p className="panel-aviso">{m.metadata.aviso.mensaje}</p>
									)}
									{tarjeta && (
										<div className="agente-tarjeta">
											<h3>{tarjeta.guion.titulo}</h3>
											<p>
												{tarjeta.instruccion.red} ·{" "}
												{tarjeta.instruccion.duracion_s} segundos
											</p>
											<details>
												<summary>Ver escenas y contenido del guion</summary>
												<EditorGuion
													guion={tarjeta.guion}
													cambiar={() => {}}
													bloqueado
												/>
											</details>
											{borradores.guardados.has(m.id) ? (
												<p>Guardado como borrador</p>
											) : (
												<button
													className="boton"
													type="button"
													disabled={chat.ocupado || borradores.guardando}
													onClick={() => void borradores.guardar(m.id, tarjeta)}
												>
													Guardar como borrador
												</button>
											)}
										</div>
									)}
								</article>
							);
						})}
						{chat.ocupado && (
							<p>{consultando ? "Consultando datos…" : "Escribiendo…"}</p>
						)}
					</div>
					{borradores.error && <p role="alert">{borradores.error}</p>}
					{chat.error && (
						<div className="panel-aviso" role="alert">
							<p>{chat.error}</p>
							<button
								className="boton secundario"
								type="button"
								disabled={chat.ocupado}
								onClick={() => void chat.reintentar()}
							>
								Intentar de nuevo
							</button>
						</div>
					)}
					{sinRespuesta && (
						<p role="status">
							El agente no pudo completar la respuesta. Envía otro mensaje para
							continuar.
						</p>
					)}
					<form
						onSubmit={(e) => {
							e.preventDefault();
							enviar();
						}}
					>
						<p id="chat-privacidad">
							Pide un guion sobre un producto, una sede, una temporada o la
							marca. Evita incluir datos personales.
						</p>
						<label htmlFor="chat-mensaje">Mensaje para el agente</label>
						<textarea
							id="chat-mensaje"
							value={texto}
							maxLength={2000}
							aria-describedby="chat-privacidad chat-contador"
							onChange={(e) => setTexto(e.target.value)}
							onKeyDown={(e) => {
								if (
									e.key === "Enter" &&
									!e.shiftKey &&
									!e.nativeEvent.isComposing
								) {
									e.preventDefault();
									enviar();
								}
							}}
						/>
						<p id="chat-contador">{texto.length}/2000 caracteres</p>
						<div className="panel-versiones-acciones">
							<button
								className="boton"
								type="submit"
								disabled={chat.ocupado || !texto.trim()}
							>
								Enviar
							</button>
							{chat.ocupado && (
								<button
									className="boton secundario"
									type="button"
									onClick={() => void chat.detener()}
								>
									Detener
								</button>
							)}
						</div>
					</form>
				</div>
			</div>
		</section>
	);
}
