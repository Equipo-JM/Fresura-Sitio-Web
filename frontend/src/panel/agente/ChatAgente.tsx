import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	BOTONES_VIDEO,
	type BotonVideo,
	botonVideoDelTexto,
	ENLACE_VIDEO_DID,
	INICIO_CHAT,
} from "../../../../backend/supabase/functions/_shared/esquemas/chat";
import { textoPieza } from "../../../../backend/supabase/functions/_shared/esquemas/pieza";
import type { Database } from "../../tipos/database.types";
import { GuardarEnBiblioteca } from "../biblioteca/GuardarEnBiblioteca";
import { crearServicioBiblioteca } from "../biblioteca/servicioBiblioteca";
import { cuerpoGuion, leerPiezas, leerTarjeta } from "./servicioConversaciones";
import { TarjetaPieza } from "./TarjetaPieza";
import { useChatAgente } from "./useChatAgente";

function TextoAgente({ texto }: { texto: string }) {
	const prefijo = `${ENLACE_VIDEO_DID}\n`;
	const enlace = texto.startsWith(prefijo) ? texto.slice(prefijo.length) : "";
	if (enlace && URL.canParse(enlace) && new URL(enlace).protocol === "https:") {
		return (
			<p>
				{ENLACE_VIDEO_DID}{" "}
				<a href={enlace} target="_blank" rel="noreferrer">
					Abrir video
					<span className="oculto"> (se abre en otra pestaña)</span>
				</a>
			</p>
		);
	}
	return <p className="agente-texto">{texto}</p>;
}

function CopiarRespuesta({ texto }: { texto: string }) {
	const [estado, setEstado] = useState<"copiado" | "manual" | null>(null);

	async function copiar() {
		try {
			await navigator.clipboard.writeText(texto);
			setEstado("copiado");
		} catch {
			setEstado("manual");
		}
	}

	return (
		<div className="agente-copia">
			<button
				className="boton secundario compacto"
				type="button"
				onClick={() => void copiar()}
			>
				Copiar respuesta completa
			</button>
			<div role="status">
				{estado === "copiado" && "Respuesta copiada."}
				{estado === "manual" && "Usa la opción Copiar de tu dispositivo."}
			</div>
			{estado === "manual" && (
				<label>
					Texto completo para copiar
					<textarea
						readOnly
						value={texto}
						rows={5}
						ref={(campo) => {
							campo?.focus();
							campo?.select();
						}}
					/>
				</label>
			)}
		</div>
	);
}

/** Chat de guiones con historial y entregas en el propio hilo. */
export function ChatAgente({ cliente }: { cliente: SupabaseClient<Database> }) {
	const chat = useChatAgente(cliente);
	const biblioteca = useMemo(() => crearServicioBiblioteca(cliente), [cliente]);
	const [texto, setTexto] = useState("");
	const hilo = useRef<HTMLDivElement>(null);
	const seguirHilo = useRef(true);
	useEffect(() => {
		if (
			(chat.mensajes.length > 0 || chat.ocupado) &&
			seguirHilo.current &&
			hilo.current
		)
			hilo.current.scrollTop = hilo.current.scrollHeight;
	}, [chat.mensajes, chat.ocupado]);
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
		!ultimo.metadata?.tarjetaGuion &&
		!ultimo.metadata?.piezas?.length;
	function enviar() {
		if (chat.ocupado || !texto.trim()) return;
		seguirHilo.current = true;
		void chat.enviar(texto);
		setTexto("");
	}
	// Los botones de video envían la misma orden que se puede escribir.
	function pulsarVideo(boton: BotonVideo) {
		if (chat.ocupado || chat.esperandoVideo) return;
		seguirHilo.current = true;
		void chat.enviar(BOTONES_VIDEO[boton].orden);
	}
	const videoBloqueado = chat.ocupado || chat.esperandoVideo;
	// D-ID siempre toma el último guion de la conversación: solo esa tarjeta ofrece el video.
	const ultimoGuionId = chat.mensajes.findLast((m) => {
		const tarjeta = leerTarjeta(m.metadata?.tarjetaGuion);
		return tarjeta?.guion.escenas.some((escena) => escena.voz.trim());
	})?.id;
	return (
		<section className="panel-seccion" aria-labelledby="chat-titulo">
			<h2 id="chat-titulo">Conversar con el agente</h2>
			<div className="agente-distribucion">
				<nav className="agente-historial" aria-label="Conversaciones">
					<h3>Historial</h3>
					<button
						className="boton secundario"
						type="button"
						disabled={chat.ocupado}
						onClick={() => {
							seguirHilo.current = true;
							chat.nuevaConversacion();
						}}
					>
						Nueva conversación
					</button>
					<ul className="agente-conversaciones">
						{chat.historial.filas.map((c) => (
							<li key={c.id}>
								<button
									className="boton-texto agente-conversacion"
									type="button"
									aria-current={
										chat.conversacionActiva === c.id ? "true" : undefined
									}
									disabled={chat.ocupado}
									onClick={() => {
										seguirHilo.current = true;
										void chat.cambiarConversacion(c.id);
									}}
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
									<fieldset
										className="agente-confirmar-borrado"
										aria-label="Confirmar borrado"
									>
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
					{(chat.historial.numero > 0 || chat.historial.hayAnteriores) && (
						<div className="agente-paginacion">
							<button
								className="boton-texto"
								type="button"
								disabled={chat.ocupado || chat.historial.numero === 0}
								onClick={() => {
									setConfirmacion(null);
									void chat.cambiarPagina(chat.historial.numero - 1);
								}}
							>
								Más recientes
							</button>
							<span role="status">Página {chat.historial.numero + 1}</span>
							<button
								className="boton-texto"
								type="button"
								disabled={chat.ocupado || !chat.historial.hayAnteriores}
								onClick={() => {
									setConfirmacion(null);
									void chat.cambiarPagina(chat.historial.numero + 1);
								}}
							>
								Anteriores
							</button>
						</div>
					)}
					{chat.errorHistorial && (
						<div>
							<p role="alert">{chat.errorHistorial}</p>
							<button
								className="boton-texto"
								type="button"
								disabled={chat.ocupado}
								onClick={() => void chat.cambiarPagina(chat.historial.numero)}
							>
								Recargar historial
							</button>
						</div>
					)}
				</nav>
				<div className="agente-chat">
					<div
						className="agente-hilo"
						ref={hilo}
						onScroll={({ currentTarget }) => {
							seguirHilo.current =
								currentTarget.scrollHeight -
									currentTarget.scrollTop -
									currentTarget.clientHeight <
								48;
						}}
						role="log"
						aria-live="polite"
						aria-relevant="additions text"
						aria-label="Mensajes del agente"
					>
						{!chat.conversacionActiva && chat.mensajes.length === 0 && (
							<article className="panel-bloque agente-mensaje">
								<strong>Agente</strong>
								<p className="agente-texto">{INICIO_CHAT}</p>
							</article>
						)}
						{chat.mensajes.map((m) => {
							const tarjeta = leerTarjeta(m.metadata?.tarjetaGuion);
							const piezas = leerPiezas(m.metadata?.piezas);
							const partes = m.parts.filter((parte) => parte.type === "text");
							const cuerpo = tarjeta ? cuerpoGuion(tarjeta.guion) : "";
							const botonVideo =
								m.role === "assistant" && m.id === ultimo?.id
									? botonVideoDelTexto(partes.map((p) => p.text).join("\n"))
									: null;
							const ficha = tarjeta
								? `${tarjeta.instruccion.red} · ${tarjeta.instruccion.duracion_s} segundos`
								: "";
							const textoCompleto = [
								...partes.map((parte) => parte.text),
								tarjeta?.guion.titulo,
								ficha,
								cuerpo,
								...piezas.map(textoPieza),
							]
								.filter((parte) => parte?.trim())
								.join("\n\n");
							return (
								<article className="panel-bloque agente-mensaje" key={m.id}>
									<strong>{m.role === "user" ? "Tú" : "Agente"}</strong>
									{partes.map((p) => (
										<TextoAgente key={p.type + p.text} texto={p.text} />
									))}
									{botonVideo && (
										<div className="agente-acciones">
											<button
												className="boton"
												type="button"
												disabled={videoBloqueado}
												onClick={() => pulsarVideo(botonVideo)}
											>
												{BOTONES_VIDEO[botonVideo].etiqueta}
											</button>
										</div>
									)}
									{m.metadata?.aviso && (
										<p className="panel-aviso">{m.metadata.aviso.mensaje}</p>
									)}
									{tarjeta && (
										<div className="agente-tarjeta">
											<h3>{tarjeta.guion.titulo}</h3>
											<p>{ficha}</p>
											<p className="agente-texto">{cuerpo}</p>
											<div className="agente-acciones">
												<GuardarEnBiblioteca
													guardar={() =>
														biblioteca.guardarGuion(
															tarjeta,
															chat.conversacionActiva,
														)
													}
												/>
												{m.id === ultimoGuionId && (
													<button
														className="boton"
														type="button"
														disabled={videoBloqueado}
														onClick={() => pulsarVideo("preparar")}
													>
														{BOTONES_VIDEO.preparar.etiqueta}
													</button>
												)}
											</div>
										</div>
									)}
									{piezas.map((pieza) => (
										<TarjetaPieza
											key={pieza.tipo + pieza.titulo}
											pieza={pieza}
											acciones={
												<GuardarEnBiblioteca
													guardar={() =>
														biblioteca.guardarPieza(
															pieza,
															chat.conversacionActiva,
														)
													}
												/>
											}
										/>
									))}
									{m.role === "assistant" &&
										textoCompleto &&
										(!chat.ocupado || m.id !== ultimo?.id) && (
											<CopiarRespuesta texto={textoCompleto} />
										)}
								</article>
							);
						})}
						{chat.ocupado && (
							<p>{consultando ? "Consultando datos…" : "Escribiendo…"}</p>
						)}
						{chat.esperandoVideo && <p>Esperando el video de D-ID…</p>}
					</div>
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
							Evita incluir datos personales en el chat.
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
