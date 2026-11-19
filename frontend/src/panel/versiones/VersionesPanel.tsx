import type { SupabaseClient } from "@supabase/supabase-js";
import { useRef, useState } from "react";
import { Link } from "react-router";
import type { Database } from "../../tipos/database.types";
import { useVersiones } from "./useVersiones";

function fecha(valor: string | null) {
	return valor
		? new Intl.DateTimeFormat("es-CO", {
				dateStyle: "long",
				timeStyle: "short",
			}).format(new Date(valor))
		: "Sin fecha de publicación";
}

/** Administración de versiones publicadas y borradores, con acceso a los guiones del panel. */
export function VersionesPanel({
	cliente,
	irGuiones,
	abrirVistaPrevia = () => window.location.assign("/admin/vista-previa"),
}: {
	cliente: SupabaseClient<Database>;
	irGuiones?: () => void;
	abrirVistaPrevia?: () => void;
}) {
	const panel = useVersiones(cliente);
	const [aprobado, setAprobado] = useState(false);
	const [confirmacion, setConfirmacion] = useState<
		"descartar" | "restaurar" | null
	>(null);
	const [publicando, setPublicando] = useState(false);
	const volverFoco = useRef<HTMLButtonElement | null>(null);
	const { versiones, ocupado, error, mensaje } = panel;
	const cerrarConfirmacion = () => {
		setConfirmacion(null);
		volverFoco.current?.focus();
	};

	return (
		<div className="panel">
			<a className="saltar" href="#versiones">
				Saltar al contenido
			</a>
			<header className="panel-h">
				<div className="envoltura panel-h-fila">
					<img
						src="/marca/logo-horizontal-color.svg"
						alt="Fresura"
						width="150"
						height="27"
					/>
					<span className="panel-demo-etiqueta">Sesión verificada</span>
					<nav className="panel-h-acciones" aria-label="Panel">
						<Link className="boton secundario compacto" to="/" target="_blank">
							Ver el sitio
							<span className="oculto"> (se abre en otra pestaña)</span>
						</Link>
						<button
							className="boton-texto"
							type="button"
							onClick={() => void cliente.auth.signOut()}
						>
							Salir
						</button>
					</nav>
				</div>
			</header>
			<div className="envoltura panel-cuerpo">
				<nav aria-label="Secciones del panel">
					<a href="#versiones" aria-current="page">
						Versiones
					</a>
					{irGuiones && (
						<button
							className="boton-texto"
							type="button"
							disabled={ocupado}
							onClick={irGuiones}
						>
							Agente
						</button>
					)}
				</nav>
				<main
					id="versiones"
					className="panel-versiones"
					tabIndex={-1}
					aria-busy={ocupado}
				>
					<div className="panel-versiones-cabecera">
						<h1>Versiones</h1>
						<button
							type="button"
							className="boton secundario compacto"
							disabled={ocupado}
							onClick={() => void panel.recargar()}
						>
							Recargar
						</button>
					</div>
					{error && (
						<p className="panel-aviso" role="alert">
							{error}
						</p>
					)}
					<div role="status">
						{mensaje && (
							<p>
								{mensaje === "¡Listo!" ? (
									<>
										<strong>¡Listo!</strong> Tus cambios ya están en el sitio.
									</>
								) : (
									mensaje
								)}
							</p>
						)}
					</div>
					{!versiones && !error && <p>Cargando…</p>}
					{versiones && (
						<div className="panel-versiones-resumen">
							<section
								className="panel-versiones-tarjeta"
								aria-labelledby="publicada-titulo"
							>
								<h2 id="publicada-titulo">Lo que está en el sitio</h2>
								<p>
									{versiones.publicada ? (
										<>
											Publicado el{" "}
											<time
												dateTime={versiones.publicada.publicada_en ?? undefined}
											>
												{fecha(versiones.publicada.publicada_en)}
											</time>
										</>
									) : (
										"Aún no hay una versión publicada."
									)}
								</p>
								{versiones.anterior ? (
									<p>
										Versión anterior del{" "}
										{fecha(versiones.anterior.publicada_en)}
									</p>
								) : (
									<>
										<h3>Sin versión anterior</h3>
										<p>Cuando publiques un cambio, aquí podrás deshacerlo.</p>
									</>
								)}
								<button
									type="button"
									className="boton secundario"
									disabled={!versiones.anterior || ocupado}
									onClick={(evento) => {
										volverFoco.current = evento.currentTarget;
										setConfirmacion("restaurar");
									}}
								>
									Volver a la versión anterior
								</button>
							</section>
							<section
								className="panel-versiones-tarjeta"
								aria-labelledby="borrador-titulo"
							>
								<h2 id="borrador-titulo">
									{versiones.borrador ? "Borrador guardado" : "Borrador"}
								</h2>
								{versiones.borrador ? (
									<>
										<p>
											Tus cambios están guardados. Aún no se ven en el sitio.
										</p>
										<label className="panel-aprobacion">
											<input
												type="checkbox"
												name="contenido-aprobado"
												checked={aprobado}
												disabled={ocupado}
												onChange={(evento) =>
													setAprobado(evento.target.checked)
												}
											/>{" "}
											Todo el contenido fue aprobado por Fresura
										</label>
										<div className="panel-versiones-acciones">
											<button
												type="button"
												className="boton secundario"
												disabled={ocupado}
												onClick={() => void panel.guardar()}
											>
												Guardar borrador
											</button>
											<button
												type="button"
												className="boton secundario"
												disabled={ocupado}
												onClick={async () => {
													if (await panel.guardar()) abrirVistaPrevia();
												}}
											>
												Ver vista previa
											</button>
											<button
												type="button"
												className="boton"
												disabled={ocupado}
												onClick={async () => {
													setPublicando(true);
													if (await panel.publicar(aprobado))
														setAprobado(false);
													setPublicando(false);
												}}
											>
												{publicando ? "Publicando…" : "Publicar"}
											</button>
											<button
												type="button"
												className="boton-texto"
												disabled={ocupado}
												onClick={(evento) => {
													volverFoco.current = evento.currentTarget;
													setConfirmacion("descartar");
												}}
											>
												Descartar borrador
											</button>
										</div>
									</>
								) : (
									<button
										type="button"
										className="boton"
										disabled={!versiones.publicada || ocupado}
										onClick={() => {
											setAprobado(false);
											void panel.editar();
										}}
									>
										Editar
									</button>
								)}
							</section>
							{confirmacion && (
								<dialog
									className="panel-confirmacion"
									aria-labelledby="confirmacion-titulo"
									ref={(dialogo) => {
										if (dialogo && !dialogo.open) dialogo.showModal();
									}}
									onCancel={(evento) => {
										if (ocupado) evento.preventDefault();
										else cerrarConfirmacion();
									}}
								>
									<div>
										<h2
											id="confirmacion-titulo"
											tabIndex={-1}
											ref={(elemento) => elemento?.focus()}
										>
											{confirmacion === "descartar"
												? "¿Descartar el borrador?"
												: "¿Volver a la versión anterior?"}
										</h2>
										<p>
											{confirmacion === "descartar"
												? "Se perderán los cambios sin publicar. El sitio seguirá igual."
												: `El sitio mostrará lo que tenía el ${fecha(versiones.anterior?.publicada_en ?? null)}. Podrás deshacerlo después.`}
										</p>
										{confirmacion === "restaurar" && versiones.borrador && (
											<>
												<p>Tienes un borrador sin publicar</p>
												<p>Revísalo o descártalo antes de publicarlo.</p>
												<button
													type="button"
													className="boton-texto"
													disabled={ocupado}
													onClick={() => setConfirmacion("descartar")}
												>
													Descartar borrador
												</button>
											</>
										)}
										<div className="panel-versiones-acciones">
											<button
												type="button"
												className="boton"
												disabled={ocupado}
												onClick={async () => {
													const exito = await (confirmacion === "descartar"
														? panel.descartar()
														: panel.restaurar());
													if (exito) cerrarConfirmacion();
												}}
											>
												{confirmacion === "descartar"
													? "Sí, descartar"
													: "Sí, volver"}
											</button>
											<button
												type="button"
												className="boton secundario"
												disabled={ocupado}
												onClick={cerrarConfirmacion}
											>
												Cancelar
											</button>
										</div>
									</div>
								</dialog>
							)}
						</div>
					)}
				</main>
			</div>
		</div>
	);
}
