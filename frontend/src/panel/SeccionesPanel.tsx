import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { Link } from "react-router";
import { Icono } from "../compartido/componentes/Icono";
import type { Database } from "../tipos/database.types";
import { ContenidoPanel } from "./contenido/ContenidoPanel";
import { GuionesPanel } from "./guiones/GuionesPanel";
import { VersionesPanel } from "./versiones/VersionesPanel";

const SECCIONES = [
	["contenido", "Contenido"],
	["versiones", "Versiones"],
	["guiones", "Agente"],
] as const;

/** Navegación compartida del administrador con protección de cambios sin guardar. */
export function SeccionesPanel({
	cliente,
}: {
	cliente: SupabaseClient<Database>;
}) {
	const [seccion, setSeccion] =
		useState<(typeof SECCIONES)[number][0]>("versiones");
	const [pendiente, setPendiente] = useState(false);

	function abrir(siguiente: typeof seccion) {
		if (siguiente === seccion) return;
		if (
			pendiente &&
			!window.confirm(
				"Tienes cambios sin guardar. ¿Salir de Contenido y perder esos cambios?",
			)
		)
			return;

		setPendiente(false);
		setSeccion(siguiente);
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
		<div className="panel panel-admin">
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
						<div className="panel-admin-acciones">
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
					<div className="panel-admin-fila panel-admin-fila-menu">
						<nav className="panel-admin-menu" aria-label="Menú del panel">
							{SECCIONES.map(([valor, nombre]) => (
								<button
									key={valor}
									type="button"
									aria-current={seccion === valor ? "page" : undefined}
									onClick={() => abrir(valor)}
								>
									{nombre}
								</button>
							))}
						</nav>
						<span className="panel-sesion">
							<Icono nombre="ok" />
							Sesión verificada
						</span>
					</div>
				</div>
			</header>
			<div className="envoltura panel-cuerpo">
				{seccion === "versiones" && <VersionesPanel cliente={cliente} />}
				{seccion === "contenido" && (
					<ContenidoPanel cliente={cliente} onPendiente={setPendiente} />
				)}
				{seccion === "guiones" && <GuionesPanel cliente={cliente} />}
			</div>
		</div>
	);
}
