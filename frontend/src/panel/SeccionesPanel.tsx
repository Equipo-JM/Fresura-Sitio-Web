import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { Link } from "react-router";
import { Icono } from "../compartido/componentes/Icono";
import type { Database } from "../tipos/database.types";
import { BLOQUES, VISTAS } from "./apartados";
import { ContenidoPanel } from "./contenido/ContenidoPanel";
import { EscritorioPanel } from "./EscritorioPanel";
import { GuionesPanel } from "./guiones/GuionesPanel";

import { VersionesPanel } from "./versiones/VersionesPanel";

const SECCIONES = [
	["escritorio", "Escritorio"],
	["contenido", "Contenido"],
	["reels", "Reels de portada"],
	["versiones", "Versiones"],
	["guiones", "Agente"],
] as const;

type Seccion = (typeof SECCIONES)[number][0];
function leerVista() {
	const base = {
		densidad: "comoda",
		inicio: "escritorio" as Seccion,
	};
	try {
		const datos = JSON.parse(
			localStorage.getItem("fresura.panel.vista") ?? "null",
		);
		if (datos && typeof datos === "object")
			return {
				densidad: datos.densidad === "compacta" ? "compacta" : "comoda",
				inicio:
					SECCIONES.find(([id]) => id === datos.inicio)?.[0] ?? base.inicio,
			};
	} catch {
		return base;
	}
	return base;
}

/** Navegación compartida del administrador con protección de cambios sin guardar. */
export function SeccionesPanel({
	cliente,
}: {
	cliente: SupabaseClient<Database>;
}) {
	const [vista, setVista] = useState(leerVista);
	const [seccion, setSeccion] = useState<Seccion>(
		vista.inicio === "reels" ? "contenido" : vista.inicio,
	);
	function ajustar(cambio: Partial<typeof vista>) {
		const siguiente = { ...vista, ...cambio };
		setVista(siguiente);
		try {
			localStorage.setItem("fresura.panel.vista", JSON.stringify(siguiente));
		} catch {
			/* Los ajustes siguen activos durante la sesión. */
		}
	}
	const [bloque, setBloque] = useState<(typeof BLOQUES)[number]>(
		vista.inicio === "reels" ? "Reels de portada" : "Productos",
	);
	const [agente, setAgente] = useState<(typeof VISTAS)[number][0]>("chat");
	const [menuAbierto, setMenuAbierto] = useState(false);
	const [pendiente, setPendiente] = useState(false);

	function abrir(siguiente: typeof seccion) {
		if (siguiente === seccion) return true;
		if (
			pendiente &&
			!window.confirm(
				"Tienes cambios sin guardar. ¿Salir de Contenido y perder esos cambios?",
			)
		)
			return false;

		setPendiente(false);
		setSeccion(siguiente);
		setMenuAbierto(false);
		return true;
	}

	function enlace(
		destino: Seccion,
		nombre: string,
		activo = true,
		elegir?: () => void,
	) {
		return (
			<button
				key={nombre}
				type="button"
				aria-current={seccion === destino && activo ? "page" : undefined}
				onClick={() => {
					if (abrir(destino)) {
						elegir?.();
						setMenuAbierto(false);
					}
				}}
			>
				{nombre}
			</button>
		);
	}
	function salir() {
		if (
			!pendiente ||
			window.confirm(
				"Tienes cambios sin guardar. ¿Cerrar sesión y perder esos cambios?",
			)
		)
			void cliente.auth.signOut();
	}

	return (
		<div className="panel panel-admin" data-densidad={vista.densidad}>
			<a className="saltar" href={`#${seccion}`}>
				Saltar al contenido
			</a>
			<header className="panel-admin-cabecera">
				<div className="envoltura">
					<div className="panel-admin-fila">
						<img
							className="panel-admin-logo"
							src="/marca/logo-horizontal-color.svg"
							alt="Fresura"
							width="150"
							height="27"
						/>
						<button
							className="mesa-menu-movil"
							type="button"
							aria-expanded={menuAbierto}
							aria-controls="indice-panel"
							onClick={() => setMenuAbierto(!menuAbierto)}
						>
							Menú
						</button>
						<div className="panel-admin-acciones">
							<span className="panel-sesion">
								<Icono nombre="ok" />
								Sesión verificada
							</span>
							<Link className="panel-accion" to="/" target="_blank">
								Ver el sitio
								<Icono nombre="externo" />
								<span className="oculto"> (se abre en otra pestaña)</span>
							</Link>
							<button className="panel-accion" type="button" onClick={salir}>
								Salir
							</button>
						</div>
					</div>
				</div>
			</header>
			<div className="mesa-disposicion">
				<aside
					id="indice-panel"
					data-abierto={menuAbierto}
					className="mesa-indice"
				>
					<nav
						className="panel-admin-menu indice-prototipo"
						aria-label="Menú del panel"
					>
						<p>Mesa de trabajo</p>
						{enlace("escritorio", "Escritorio")}
						{enlace("versiones", "Versiones")}
						<p>Contenido</p>

						{BLOQUES.map((b) =>
							enlace("contenido", b, bloque === b, () => setBloque(b)),
						)}
						<p>Estudio creativo</p>
						{VISTAS.map(([id, n]) =>
							enlace("guiones", n, agente === id, () => setAgente(id)),
						)}
					</nav>
					<details className="mesa-vista">
						<summary>Mi vista</summary>

						<label>
							Espaciado de las filas
							<select
								value={vista.densidad}
								onChange={(e) => ajustar({ densidad: e.target.value })}
							>
								<option value="comoda">Cómodo</option>
								<option value="compacta">Compacto</option>
							</select>
						</label>
						<label>
							Pantalla inicial
							<select
								value={vista.inicio}
								onChange={(e) =>
									ajustar({
										inicio:
											SECCIONES.find(([id]) => id === e.target.value)?.[0] ??
											"escritorio",
									})
								}
							>
								{SECCIONES.map(([id, nombre]) => (
									<option key={id} value={id}>
										{nombre}
									</option>
								))}
							</select>
						</label>
					</details>
				</aside>
				<div className="envoltura panel-cuerpo">
					{seccion !== "escritorio" && (
						<p className="mesa-contexto">
							{seccion === "versiones"
								? "Mesa de trabajo"
								: seccion === "guiones"
									? "Estudio creativo"
									: "Contenido"}
						</p>
					)}
					{seccion === "escritorio" && (
						<EscritorioPanel cliente={cliente} abrir={abrir} />
					)}

					{seccion === "versiones" && <VersionesPanel cliente={cliente} />}
					{seccion === "contenido" && (
						<ContenidoPanel
							bloqueActivo={bloque}
							alElegirBloque={setBloque}
							cliente={cliente}
							onPendiente={setPendiente}
						/>
					)}
					{seccion === "guiones" && (
						<GuionesPanel vistaActiva={agente} cliente={cliente} />
					)}
				</div>
			</div>
		</div>
	);
}
