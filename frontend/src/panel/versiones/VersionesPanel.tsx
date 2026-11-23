import type { SupabaseClient } from "@supabase/supabase-js";
import { useRef, useState } from "react";
import { Icono } from "../../compartido/componentes/Icono";
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

/** Administración de versiones publicadas y borradores, con confirmación para descartar o restaurar. */
export function VersionesPanel({
	cliente,
	abrirVistaPrevia = () => window.location.assign("/admin/vista-previa"),
}: {
	cliente: SupabaseClient<Database>;
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
		<main
			id="versiones"
			className="panel-versiones"
			tabIndex={-1}
			aria-busy={ocupado}
		>
			<div className="panel-versiones-cabecera">
				<div>
					<h1>Versiones</h1>
					<button
						type="button"
						className="panel-accion"
						disabled={ocupado}
						onClick={() => void panel.recargar()}
					>
						<Icono nombre="recargar" />
						Recargar
					</button>
				</div>
				<div className="panel-versiones-adorno">
					<img
						src="/marca/sticker-simbolo.svg"
						alt=""
						width="144"
						height="126"
					/>
				</div>
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
						className="panel-versiones-tarjeta panel-versiones-publicada"
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
						<div className="panel-versiones-anterior">
							{versiones.anterior ? (
								<p>
									Versión anterior del {fecha(versiones.anterior.publicada_en)}
								</p>
							) : (
								<>
									<h3>Sin versión anterior</h3>
									<p>Cuando publiques un cambio, aquí podrás deshacerlo.</p>
								</>
							)}
							<button
								type="button"
								className="panel-accion"
								disabled={!versiones.anterior || ocupado}
								onClick={(evento) => {
									volverFoco.current = evento.currentTarget;
									setConfirmacion("restaurar");
								}}
							>
								<Icono nombre="izquierda" />
								Volver a la versión anterior
							</button>
						</div>
					</section>
					<section
						className="panel-versiones-tarjeta panel-versiones-borrador"
						aria-labelledby="borrador-titulo"
					>
						<h2 id="borrador-titulo">
							{versiones.borrador
								? "Cambios guardados"
								: "Sin cambios pendientes"}
						</h2>
						{versiones.borrador ? (
							<>
								<p>Estos cambios todavía no aparecen en el sitio.</p>
								<label className="panel-aprobacion">
									<input
										type="checkbox"
										name="contenido-aprobado"
										checked={aprobado}
										disabled={ocupado}
										onChange={(evento) => setAprobado(evento.target.checked)}
									/>{" "}
									Todo el contenido fue aprobado por Fresura
								</label>
								<div className="panel-versiones-acciones">
									<button
										type="button"
										className="boton"
										disabled={ocupado}
										onClick={async () => {
											setPublicando(true);
											if (await panel.publicar(aprobado)) setAprobado(false);
											setPublicando(false);
										}}
									>
										{publicando ? "Publicando…" : "Publicar cambios"}
									</button>
									<button
										type="button"
										className="boton secundario"
										disabled={ocupado}
										onClick={async () => {
											if (await panel.guardar()) abrirVistaPrevia();
										}}
									>
										<Icono nombre="ojo" />
										Ver vista previa
									</button>
								</div>
								<button
									type="button"
									className="panel-accion panel-descartar"
									disabled={ocupado}
									onClick={(evento) => {
										volverFoco.current = evento.currentTarget;
										setConfirmacion("descartar");
									}}
								>
									Descartar cambios
								</button>
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
										? "¿Descartar los cambios?"
										: "¿Volver a la versión anterior?"}
								</h2>
								<p>
									{confirmacion === "descartar"
										? "Se perderán los cambios sin publicar. El sitio seguirá igual."
										: `El sitio mostrará lo que tenía el ${fecha(versiones.anterior?.publicada_en ?? null)}. Podrás deshacerlo después.`}
								</p>
								{confirmacion === "restaurar" && versiones.borrador && (
									<>
										<p>Tienes cambios sin publicar</p>
										<p>Revísalos o descártalos antes de publicarlos.</p>
										<button
											type="button"
											className="boton-texto"
											disabled={ocupado}
											onClick={() => setConfirmacion("descartar")}
										>
											Descartar cambios
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
	);
}
