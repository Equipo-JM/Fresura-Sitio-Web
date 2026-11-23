import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import type { Database } from "../../tipos/database.types";
import { ChatAgente } from "../agente/ChatAgente";
import { VISTAS } from "../apartados";
import { BibliotecaPanel } from "../biblioteca/BibliotecaPanel";
import { EstiloRedesPanel } from "../estilo/EstiloRedesPanel";

type Vista = (typeof VISTAS)[number][0];
/** Sección «Agente» del panel: chat, biblioteca y estilo de redes. */
export function GuionesPanel({
	cliente,
	vistaActiva,
}: {
	vistaActiva?: Vista;
	cliente: SupabaseClient<Database>;
}) {
	const [vistaLocal, setVista] = useState<(typeof VISTAS)[number][0]>("chat");
	const vista = vistaActiva ?? vistaLocal;
	// Biblioteca y estilo se montan de nuevo al abrirlos para leer lo recién guardado.
	const [aperturas, setAperturas] = useState(0);
	return (
		<main className="guiones-panel" id="guiones" tabIndex={-1}>
			<h1>Agente de contenido</h1>
			<fieldset hidden={!!vistaActiva} className="panel-subsecciones">
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
