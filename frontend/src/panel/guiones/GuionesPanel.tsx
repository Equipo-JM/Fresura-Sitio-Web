import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { Link } from "react-router";
import type { Database } from "../../tipos/database.types";
import { ChatAgente } from "../agente/ChatAgente";
import { BibliotecaPanel } from "../biblioteca/BibliotecaPanel";
import { EstiloRedesPanel } from "../estilo/EstiloRedesPanel";

const VISTAS = [
	["chat", "Chat"],
	["biblioteca", "Biblioteca"],
	["estilo", "Estilo de redes"],
] as const;
/** Acceso al chat de Guiones desde el panel administrativo. */
export function GuionesPanel({
	cliente,
	irVersiones,
}: {
	cliente: SupabaseClient<Database>;
	irVersiones: () => void;
}) {
	const [vista, setVista] = useState<(typeof VISTAS)[number][0]>("chat");
	// Biblioteca y estilo se montan de nuevo al abrirlos para leer lo recién guardado.
	const [aperturas, setAperturas] = useState(0);
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
							onClick={() => void cliente.auth.signOut()}
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
					<button className="boton-texto" type="button" onClick={irVersiones}>
						Versiones
					</button>
					<a href="#guiones" aria-current="page">
						Guiones
					</a>
				</nav>
				<main id="guiones" tabIndex={-1}>
					<h1>Guiones</h1>
					<fieldset className="agente-vistas">
						<legend className="oculto">Vista</legend>
						{VISTAS.map(([valor, nombre]) => (
							<button
								key={valor}
								className={`boton compacto${vista === valor ? "" : " secundario"}`}
								type="button"
								aria-pressed={vista === valor}
								onClick={() => {
									setVista(valor);
									setAperturas((n) => n + 1);
								}}
							>
								{nombre}
							</button>
						))}
					</fieldset>
					{/* El chat queda montado para no perder la conversación abierta. */}
					<div hidden={vista !== "chat"}>
						<ChatAgente cliente={cliente} />
					</div>
					{vista === "biblioteca" && (
						<BibliotecaPanel key={aperturas} cliente={cliente} />
					)}
					{vista === "estilo" && (
						<EstiloRedesPanel key={aperturas} cliente={cliente} />
					)}
				</main>
			</div>
		</div>
	);
}
