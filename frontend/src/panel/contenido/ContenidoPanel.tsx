import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useRef, useState } from "react";
import {
	type Contenido,
	esquemaContenido,
} from "../../../../backend/supabase/functions/_shared/esquemas/contenido";
import { Icono } from "../../compartido/componentes/Icono";
import { RESENAS_GOOGLE } from "../../sitio/inicio/copy";
import type { Database } from "../../tipos/database.types";
import { BLOQUES } from "../apartados";
import { ReelsPanel } from "../ReelsPanel";
import { useVersiones } from "../versiones/useVersiones";
import { ContextoEdicion, cambiarCampo } from "./Campos";
import { Categorias } from "./Categorias";
import { completarIdentificadores, erroresContenido } from "./edicionContenido";
import { NegocioSedes } from "./NegocioSedes";
import { Opiniones, ResenasPublicadas } from "./Opiniones";
import { Preguntas } from "./Preguntas";
import { Productos } from "./Productos";
import { Promociones } from "./Promociones";
import { useAvisoSalida, useFocoError } from "./useInteraccionEdicion";

type Bloque = (typeof BLOQUES)[number];

/** Carga únicamente el borrador administrativo y crea una copia con el servicio existente. */
export function ContenidoPanel({
	cliente,
	onPendiente,
	bloqueActivo,
	alElegirBloque,
}: {
	bloqueActivo?: Bloque;
	alElegirBloque?: (bloque: Bloque) => void;
	onPendiente?: (valor: boolean) => void;
	cliente: SupabaseClient<Database>;
}) {
	const panel = useVersiones(cliente);
	const [recarga, setRecarga] = useState(0);
	const [pendiente, setPendiente] = useState(false);
	const marcarPendiente = useCallback(
		(valor: boolean) => {
			setPendiente(valor);
			onPendiente?.(valor);
		},
		[onPendiente],
	);
	async function recargar() {
		if (
			pendiente &&
			!window.confirm(
				"Tienes cambios sin guardar. ¿Recargar y perder esos cambios?",
			)
		)
			return;
		if (await panel.recargar()) {
			setRecarga((actual) => actual + 1);
			marcarPendiente(false);
		}
	}
	const { versiones, error, ocupado } = panel;
	const resultado = versiones?.borrador
		? esquemaContenido.safeParse(versiones.borrador.json)
		: null;
	return (
		<main id="contenido" tabIndex={-1} aria-busy={ocupado}>
			<div className="panel-titulo-fila">
				<h1>{bloqueActivo ?? "Contenido"}</h1>
				<button
					type="button"
					className="panel-accion"
					disabled={ocupado}
					onClick={() => void recargar()}
				>
					<Icono nombre="recargar" />
					{!versiones && error ? "Reintentar" : "Recargar"}
				</button>
			</div>
			{error && (
				<p className="panel-aviso" role="alert">
					{error}
				</p>
			)}
			{!versiones && !error && <p>Cargando productos…</p>}
			{versiones && !versiones.borrador && bloqueActivo === "Opiniones" && (
				<ResenasPublicadas
					resenas={
						esquemaContenido.safeParse(versiones.publicada?.json).data
							?.opiniones.resenas
					}
				/>
			)}
			{versiones && !versiones.borrador && (
				<>
					<p>
						Tus cambios se verán en el sitio cuando los publiques desde
						Versiones.
					</p>
					<button
						type="button"
						className="boton"
						disabled={!versiones.publicada || ocupado}
						onClick={() => void panel.editar()}
					>
						Editar
					</button>
					{!versiones.publicada && (
						<p>Aún no hay una versión publicada para editar.</p>
					)}
				</>
			)}
			{resultado?.success && (
				<EditorContenido
					key={`${versiones?.borrador?.id}-${recarga}`}
					bloqueActivo={bloqueActivo}
					alElegirBloque={alElegirBloque}
					pendiente={marcarPendiente}
					inicial={resultado.data}
					cliente={cliente}
					guardar={panel.guardar}
					ocupado={ocupado}
				/>
			)}{" "}
			{resultado && !resultado.success && (
				<p role="alert">
					No pudimos abrir el contenido. Avisa al equipo para que revise los
					datos guardados.
				</p>
			)}
		</main>
	);
}

function EditorContenido({
	bloqueActivo,
	alElegirBloque,
	pendiente,
	inicial,
	cliente,
	guardar,
	ocupado,
}: {
	bloqueActivo?: Bloque;
	alElegirBloque?: (bloque: Bloque) => void;
	pendiente: (valor: boolean) => void;
	inicial: Contenido;
	cliente: SupabaseClient<Database>;
	guardar: (contenido: unknown) => Promise<boolean>;
	ocupado: boolean;
}) {
	const [contenido, setContenido] = useState(
		() =>
			({
				...inicial,
				opiniones: {
					...inicial.opiniones,
					resenas: inicial.opiniones.resenas ?? RESENAS_GOOGLE,
				},
			}) as Contenido,
	);
	const [errores, setErrores] = useState<Record<string, string>>({});
	const [bloqueLocal, setBloqueLocal] =
		useState<(typeof BLOQUES)[number]>("Productos");
	const bloque = bloqueActivo ?? bloqueLocal;
	const setBloque = alElegirBloque ?? setBloqueLocal;
	const [fotos, setFotos] = useState(0);
	const [guardado, setGuardado] = useState(false);
	const formulario = useRef<HTMLFormElement>(null);
	const [seleccion, setSeleccion] = useState<number | null>(null);
	const [destino, setDestino] = useState<{ ruta: string } | null>(null);
	const [cambios, setCambios] = useState(false);
	useAvisoSalida(cambios || fotos > 0);
	useFocoError(formulario, destino);
	function abrirCampo(ruta: string) {
		const [apartado, indice] = ruta.split(".");
		const bloques: Record<string, (typeof BLOQUES)[number]> = {
			productos: "Productos",
			promociones: "Promociones",
			preguntas_frecuentes: "Preguntas frecuentes",
			negocio: "Negocio y sedes",
			opiniones: "Opiniones",
			categorias: "Categorías",
		};
		setBloque(bloques[apartado] ?? "Productos");
		if (apartado === "productos" && indice !== undefined)
			setSeleccion(Number(indice));
		setDestino({ ruta });
	}
	async function enviar() {
		if (ocupado || fotos > 0) return;
		const preparado = completarIdentificadores(contenido);
		const fallos = erroresContenido(preparado);
		setErrores(fallos);
		if (Object.keys(fallos).length) abrirCampo(Object.keys(fallos)[0]);
		if (Object.keys(fallos).length) {
			setGuardado(false);
			return;
		}
		if (await guardar(preparado)) {
			setContenido(preparado);
			pendiente(false);
			setCambios(false);
			setGuardado(true);
		}
	}
	return (
		<ContextoEdicion.Provider
			value={{
				contenido,
				errores,
				cambiar: (ruta, valor) => {
					setContenido((actual) => cambiarCampo(actual, ruta, valor));
					setGuardado(false);
					pendiente(true);
					setCambios(true);
				},
				fotosPendientes: (cambio) => {
					setFotos((actual) => actual + cambio);
					if (cambio > 0) pendiente(true);
				},
			}}
		>
			<form
				ref={formulario}
				className="panel-editor"
				noValidate
				onSubmit={(e) => {
					e.preventDefault();
					void enviar();
				}}
			>
				<nav
					hidden={!!alElegirBloque}
					className="panel-subsecciones panel-contenido-menu"
					aria-label="Contenido editable"
				>
					{BLOQUES.map((nombre) => (
						<button
							type="button"
							key={nombre}
							aria-pressed={bloque === nombre}
							onClick={() => {
								setContenido(completarIdentificadores(contenido));
								setBloque(nombre);
							}}
						>
							{nombre}
						</button>
					))}
				</nav>

				{Object.keys(errores).length > 0 && (
					<div role="alert" className="panel-aviso">
						<h3>Revisa este campo</h3>
						<ul>
							{Object.entries(errores).map(([ruta, mensaje]) => (
								<li key={ruta}>
									<a
										href={`#error-${ruta}`}
										onClick={() => {
											abrirCampo(ruta);
										}}
									>
										{mensaje}
									</a>
								</li>
							))}
						</ul>
					</div>
				)}
				<fieldset
					disabled={ocupado || fotos > 0}
					className="panel-editor-campos"
				>
					<div hidden={bloque !== "Reels de portada"}>
						<ReelsPanel />
					</div>
					<div hidden={bloque !== "Productos"}>
						<Productos
							cliente={cliente}
							seleccion={seleccion}
							setSeleccion={setSeleccion}
						/>
					</div>
					<div hidden={bloque !== "Promociones"}>
						<Promociones />
					</div>
					<div hidden={bloque !== "Preguntas frecuentes"}>
						<Preguntas />
					</div>
					<div hidden={bloque !== "Negocio y sedes"}>
						<NegocioSedes />
					</div>
					<div hidden={bloque !== "Opiniones"}>
						<Opiniones />
					</div>
					<div hidden={bloque !== "Categorías"}>
						<Categorias />
					</div>
					<div className="panel-contenido-guardar">
						<small>Los cambios se guardan juntos.</small>
						<button type="submit" className="boton">
							{ocupado ? "Guardando…" : "Guardar cambios"}
						</button>
						<div role="status">{guardado && <p>Cambios guardados</p>}</div>
					</div>
				</fieldset>
			</form>
		</ContextoEdicion.Provider>
	);
}
