import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import type { Database } from "../../tipos/database.types";
import { ChatAgente } from "../agente/ChatAgente";
import { BibliotecaPanel } from "../biblioteca/BibliotecaPanel";
import { EstiloRedesPanel } from "../estilo/EstiloRedesPanel";

const VISTAS = [
	["chat", "Chat"],
	["biblioteca", "Biblioteca"],
	["estilo", "Estilo de redes"],
] as const;
/** Sección «Agente» del panel: chat, biblioteca y estilo de redes. */
export function GuionesPanel({
	cliente,
}: {
	cliente: SupabaseClient<Database>;
}) {
	const [vista, setVista] = useState<(typeof VISTAS)[number][0]>("chat");
	// Biblioteca y estilo se montan de nuevo al abrirlos para leer lo recién guardado.
	const [aperturas, setAperturas] = useState(0);
	return (
		<main className="guiones-panel" id="guiones" tabIndex={-1}>
			<h1>Agente de contenido</h1>
			<fieldset className="panel-subsecciones">
				<legend className="oculto">Vista</legend>
				{VISTAS.map(([valor, nombre]) => (
					<button
						key={valor}
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
	);
}
