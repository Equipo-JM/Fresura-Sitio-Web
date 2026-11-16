import {
	DURACIONES_VIDEO,
	type InstruccionGuion,
} from "../../../../backend/supabase/functions/_shared/esquemas/guion";
import { tonoSugerido } from "./useGuiones";

/** Instrucciones sin datos personales; los productos proceden solo de la versión publicada. */
export function FormularioGuion({
	valor,
	cambiar,
	productos,
	ocupado,
	generar,
}: {
	valor: InstruccionGuion;
	cambiar: (valor: InstruccionGuion) => void;
	productos: { id: string; nombre: string }[];
	ocupado: boolean;
	generar: () => void;
}) {
	return (
		<section className="panel-seccion" aria-labelledby="generar-titulo">
			<h2 id="generar-titulo">Generar un guion</h2>
			<p id="guion-privacidad">
				No escribas nombres, teléfonos, direcciones ni otros datos personales de
				clientes o de quien administra.
			</p>
			{productos.length === 0 && (
				<p>No hay productos disponibles en la versión publicada.</p>
			)}
			<form
				autoComplete="off"
				aria-describedby="guion-privacidad"
				onSubmit={(e) => {
					e.preventDefault();
					generar();
				}}
			>
				<fieldset disabled={ocupado} className="guiones-formulario">
					<legend className="oculto">Instrucciones del guion</legend>
					<label>
						Producto
						<select
							name="producto"
							required
							value={valor.producto_id}
							onChange={(e) =>
								cambiar({ ...valor, producto_id: e.target.value })
							}
						>
							<option value="">Elige un producto</option>
							{productos.map((p) => (
								<option value={p.id} key={p.id}>
									{p.nombre}
								</option>
							))}
						</select>
					</label>
					<label>
						Campaña (opcional)
						<input
							name="campana"
							maxLength={120}
							value={valor.campana ?? ""}
							onChange={(e) =>
								cambiar({ ...valor, campana: e.target.value || null })
							}
						/>
					</label>
					<label>
						Objetivo
						<select
							name="objetivo"
							value={valor.objetivo}
							onChange={(e) =>
								cambiar({
									...valor,
									objetivo: e.target.value as InstruccionGuion["objetivo"],
								})
							}
						>
							<option value="dar_a_conocer">Dar a conocer</option>
							<option value="promocion">Promoción</option>
							<option value="lanzamiento">Lanzamiento</option>
							<option value="recordacion">Recordación</option>
						</select>
					</label>
					<label>
						Red social
						<select
							name="red"
							value={valor.red}
							onChange={(e) => {
								const red = e.target.value as InstruccionGuion["red"];
								cambiar({ ...valor, red, tono: tonoSugerido(red) });
							}}
						>
							<option value="instagram">Instagram</option>
							<option value="tiktok">TikTok</option>
							<option value="facebook">Facebook</option>
						</select>
					</label>
					<label>
						Tono
						<input
							name="tono"
							required
							maxLength={80}
							value={valor.tono}
							onChange={(e) => cambiar({ ...valor, tono: e.target.value })}
						/>
					</label>
					<label>
						Duración
						<select
							name="duracion"
							value={valor.duracion_s}
							onChange={(e) =>
								cambiar({
									...valor,
									duracion_s: Number(
										e.target.value,
									) as InstruccionGuion["duracion_s"],
								})
							}
						>
							{DURACIONES_VIDEO.map((d) => (
								<option key={d} value={d}>
									{d} segundos
								</option>
							))}
						</select>
					</label>
					<button type="submit" className="boton" disabled={!productos.length}>
						Generar guion
					</button>
				</fieldset>
			</form>
		</section>
	);
}
