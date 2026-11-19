import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { Link } from "react-router";
import type { Database } from "../tipos/database.types";
import { ContenidoPanel } from "./contenido/ContenidoPanel";
import { GuionesPanel } from "./guiones/GuionesPanel";
import { VersionesPanel } from "./versiones/VersionesPanel";

/** Menú del administrador: vuelve a leer la revisión guardada al abrir cada sección. */
export function SeccionesPanel({
	cliente,
}: {
	cliente: SupabaseClient<Database>;
}) {
	const [seccion, setSeccion] = useState<"versiones" | "contenido" | "guiones">(
		"versiones",
	);
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
	// El chat trae su propio encabezado y navegación.
	if (seccion === "guiones")
		return (
			<GuionesPanel cliente={cliente} irVersiones={() => abrir("versiones")} />
		);
	return (
		<div className="panel">
			<a
				className="saltar"
				href={seccion === "contenido" ? "#contenido" : "#versiones"}
			>
				Saltar al contenido
			</a>
			{seccion === "contenido" && (
				<header className="panel-h">
					<div className="envoltura panel-h-fila">
						<img
							src="/marca/logo-horizontal-color.svg"
							alt="Fresura"
							width="150"
							height="27"
						/>
						<nav className="panel-h-acciones" aria-label="Panel">
							<Link
								className="boton secundario compacto"
								to="/"
								target="_blank"
							>
								Ver el sitio
								<span className="oculto"> (se abre en otra pestaña)</span>
							</Link>
							<button
								className="boton-texto"
								type="button"
								onClick={() => {
									if (
										!pendiente ||
										window.confirm(
											"Tienes cambios sin guardar. ¿Cerrar sesión y perder esos cambios?",
										)
									)
										void cliente.auth.signOut();
								}}
							>
								Salir
							</button>
						</nav>
					</div>
				</header>
			)}
			<nav
				className="envoltura panel-versiones-acciones"
				aria-label="Menú del panel"
			>
				<button
					type="button"
					className="boton secundario compacto"
					aria-pressed={seccion === "contenido"}
					onClick={() => abrir("contenido")}
				>
					Contenido
				</button>
				<button
					type="button"
					className="boton secundario compacto"
					aria-pressed={seccion === "versiones"}
					onClick={() => abrir("versiones")}
				>
					Versiones
				</button>
				<button
					type="button"
					className="boton secundario compacto"
					aria-pressed={false}
					onClick={() => abrir("guiones")}
				>
					Agente
				</button>
			</nav>
			{seccion === "versiones" ? (
				<VersionesPanel cliente={cliente} />
			) : (
				<div className="envoltura panel-cuerpo">
					<ContenidoPanel cliente={cliente} onPendiente={setPendiente} />
				</div>
			)}
		</div>
	);
}
