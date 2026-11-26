import { useState } from "react";
import {
	FORMATOS_DREAMINA,
	type FormatoDreamina,
	piezasDesdeGuion,
} from "../../../../backend/supabase/functions/_shared/dreamina";
import type { TarjetaGuion } from "./servicioConversaciones";
import { TarjetaPieza } from "./TarjetaPieza";

/** Permite usar un guion del hilo incluso si el turno posterior de IA falló. */
export function DreaminaDesdeGuion({ tarjeta }: { tarjeta: TarjetaGuion }) {
	const [formato, elegir] = useState<FormatoDreamina | "">("");
	return (
		<div className="agente-copia">
			<label className="campo">
				¿Cómo quieres el video en Dreamina?
				<select
					value={formato}
					onChange={(e) =>
						elegir(e.currentTarget.value as FormatoDreamina | "")
					}
				>
					<option value="">Elige el formato</option>
					{Object.entries(FORMATOS_DREAMINA).map(([valor, etiqueta]) => (
						<option key={valor} value={valor}>
							{etiqueta}
						</option>
					))}
				</select>
			</label>
			{formato ? (
				piezasDesdeGuion(tarjeta, formato).map((pieza) => (
					<TarjetaPieza key={formato + pieza.titulo} pieza={pieza} />
				))
			) : (
				<button type="button" className="boton compacto" disabled>
					Copiar y abrir Dreamina
				</button>
			)}
		</div>
	);
}
