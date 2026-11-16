import type { SupabaseClient } from "@supabase/supabase-js";
import { Link } from "react-router";
import type { Database } from "../../tipos/database.types";
import { EditorGuion } from "./EditorGuion";
import { FormularioGuion } from "./FormularioGuion";
import { PromptGuion } from "./PromptGuion";
import type { GuionGuardado } from "./servicioGuiones";
import { useGuiones } from "./useGuiones";

const ESTADOS = {
	borrador: "Borrador",
	aprobado: "Aprobado",
	descartado: "Descartado",
};
function titulo(fila: GuionGuardado) {
	const texto = fila.editado;
	return texto &&
		typeof texto === "object" &&
		!Array.isArray(texto) &&
		typeof texto.titulo === "string"
		? texto.titulo
		: "Guion guardado";
}

/** Sección del administrador para trabajar con guiones. */
export function GuionesPanel({
	cliente,
	irVersiones,
}: {
	cliente: SupabaseClient<Database>;
	irVersiones: () => void;
}) {
	const panel = useGuiones(cliente);
	const { trabajo, ocupado, datos } = panel;
	const estado = trabajo?.fila?.estado;
	return (
		<div className="panel guiones-panel">
			<a className="saltar" href="#guiones">
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
							disabled={ocupado}
							onClick={() => {
								if (panel.puedeSalir()) void cliente.auth.signOut();
							}}
						>
							Salir
						</button>
					</nav>
				</div>
			</header>
			<div className="envoltura panel-cuerpo">
				<nav
					className="panel-versiones-acciones"
					aria-label="Secciones del panel"
				>
					<button
						className="boton-texto"
						type="button"
						disabled={ocupado}
						onClick={() => {
							if (panel.puedeSalir()) irVersiones();
						}}
					>
						Versiones
					</button>
					<a href="#guiones" aria-current="page">
						Guiones
					</a>
				</nav>
				<main id="guiones" tabIndex={-1} aria-busy={ocupado}>
					<h1>Guiones</h1>
					<p className="panel-aviso">
						Revisa los datos, precios y promociones antes de aprobar. Ninguna
						acción de esta sección publica contenido.
					</p>
					{panel.error && (
						<p
							className="panel-aviso"
							role="alert"
							tabIndex={-1}
							ref={panel.avisoError}
						>
							{panel.error}
						</p>
					)}
					<div role="status" aria-live="polite">
						{ocupado
							? "Espera… La generación puede tardar hasta un minuto."
							: panel.mensaje}
					</div>
					<button
						className="boton-texto"
						type="button"
						disabled={ocupado}
						onClick={() => void panel.recargar()}
					>
						Recargar lista y productos
					</button>
					<FormularioGuion
						valor={panel.formulario}
						cambiar={panel.setFormulario}
						productos={datos?.productos ?? []}
						ocupado={ocupado}
						generar={() => void panel.generar()}
					/>
					<section
						className="panel-seccion"
						aria-labelledby="lista-guiones-titulo"
					>
						<h2 id="lista-guiones-titulo">Guiones guardados</h2>
						{datos?.guiones.length === 0 && (
							<p>Aún no hay guiones guardados.</p>
						)}
						<ul className="guiones-lista">
							{datos?.guiones.map((fila) => (
								<li key={fila.id}>
									<strong>{titulo(fila)}</strong> · {ESTADOS[fila.estado]} ·{" "}
									<time dateTime={fila.creado_en}>
										{new Intl.DateTimeFormat("es-CO", {
											dateStyle: "medium",
											timeStyle: "short",
										}).format(new Date(fila.creado_en))}
									</time>
									<button
										className="boton secundario compacto"
										type="button"
										disabled={ocupado}
										onClick={() => panel.abrir(fila)}
									>
										Abrir<span className="oculto"> {titulo(fila)}</span>
									</button>
								</li>
							))}
						</ul>
					</section>
					{trabajo && (
						<section
							className="panel-seccion"
							aria-labelledby="editor-guion-titulo"
						>
							<h2 id="editor-guion-titulo">Revisar guion</h2>
							<p>
								{trabajo.productoNombre} · {trabajo.instruccion.red} ·{" "}
								{trabajo.instruccion.duracion_s} segundos ·{" "}
								<strong>{estado ? ESTADOS[estado] : "Sin guardar"}</strong>
								{trabajo.sinGuardar && estado && " · Cambios sin guardar"}
							</p>
							<EditorGuion
								guion={trabajo.editado}
								cambiar={panel.editar}
								bloqueado={
									ocupado || (estado !== undefined && estado !== "borrador")
								}
							/>
							<div className="panel-versiones-acciones">
								<button
									type="button"
									className="boton secundario"
									disabled={ocupado}
									onClick={() => void panel.copiar(false)}
								>
									Copiar guion
								</button>
								{(!estado || estado === "borrador") && (
									<button
										type="button"
										className="boton"
										disabled={ocupado || !trabajo.sinGuardar}
										onClick={() => void panel.guardar()}
									>
										Guardar
									</button>
								)}
								{estado === "borrador" && (
									<button
										type="button"
										className="boton secundario"
										disabled={ocupado || trabajo.sinGuardar}
										onClick={() => void panel.cambiarEstado("aprobado")}
									>
										Aprobar
									</button>
								)}
								{estado === "aprobado" && (
									<button
										type="button"
										className="boton secundario"
										disabled={ocupado}
										onClick={() => void panel.cambiarEstado("borrador")}
									>
										Editar
									</button>
								)}
								{estado === "descartado" && (
									<button
										type="button"
										className="boton secundario"
										disabled={ocupado}
										onClick={() => void panel.cambiarEstado("borrador")}
									>
										Recuperar
									</button>
								)}
								{estado && estado !== "descartado" && (
									<button
										type="button"
										className="boton-texto"
										disabled={ocupado || trabajo.sinGuardar}
										onClick={() => void panel.cambiarEstado("descartado")}
									>
										Descartar
									</button>
								)}
								{estado && (
									<button
										type="button"
										className="boton-texto"
										disabled={ocupado}
										onClick={panel.eliminar}
									>
										Eliminar
									</button>
								)}
							</div>
							<PromptGuion
								aprobado={estado === "aprobado" && !trabajo.sinGuardar}
								ocupado={ocupado}
								prompt={panel.prompt}
								generar={(h) => void panel.generarPrompt(h)}
								copiar={() => void panel.copiar(true)}
							/>
						</section>
					)}
				</main>
			</div>
		</div>
	);
}
