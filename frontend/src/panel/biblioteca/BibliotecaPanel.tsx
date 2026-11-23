import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import {
	NOMBRE_PIEZA,
	TIPOS_PIEZA,
} from "../../../../backend/supabase/functions/_shared/esquemas/pieza";
import type { Database } from "../../tipos/database.types";
import { cuerpoGuion } from "../agente/servicioConversaciones";
import { TarjetaPieza } from "../agente/TarjetaPieza";
import { FichaPanel } from "../FichaPanel";
import type { EntradaBiblioteca } from "./servicioBiblioteca";
import { useBiblioteca } from "./useBiblioteca";

const NOMBRES: Record<EntradaBiblioteca["tipo"], string> = {
	guion: "Guion de video",
	...NOMBRE_PIEZA,
};

function Acciones({
	entrada,
	borrar,
}: {
	entrada: EntradaBiblioteca;
	borrar: (id: string) => void;
}) {
	const [confirmar, setConfirmar] = useState(false);
	if (confirmar)
		return (
			<>
				<span>¿Borrar «{entrada.titulo}»? No podrás recuperarla.</span>
				<button
					className="boton compacto"
					type="button"
					onClick={() => borrar(entrada.id)}
				>
					Sí, borrar
				</button>
				<button
					className="boton secundario compacto"
					type="button"
					onClick={() => setConfirmar(false)}
				>
					Cancelar
				</button>
			</>
		);
	return (
		<button
			className="boton-texto"
			type="button"
			onClick={() => setConfirmar(true)}
		>
			Borrar
		</button>
	);
}

/**
 * Piezas guardadas desde el chat para tenerlas a mano: filtrar, copiar y
 * borrar. Sin estados de aprobación: las decisiones siguen siendo de la
 * administradora (RF-18).
 */
export function BibliotecaPanel({
	cliente,
}: {
	cliente: SupabaseClient<Database>;
}) {
	const biblioteca = useBiblioteca(cliente);
	const [filtro, setFiltro] = useState<"todas" | EntradaBiblioteca["tipo"]>(
		"todas",
	);
	const visibles = biblioteca.entradas.filter(
		(entrada) => filtro === "todas" || entrada.tipo === filtro,
	);
	return (
		<section className="panel-seccion" aria-labelledby="biblioteca-titulo">
			<h2 id="biblioteca-titulo">Biblioteca</h2>
			<label>
				Tipo de pieza
				<select
					value={filtro}
					onChange={(evento) => setFiltro(evento.target.value as typeof filtro)}
				>
					<option value="todas">Todas</option>
					{(["guion", ...TIPOS_PIEZA] as const).map((tipo) => (
						<option key={tipo} value={tipo}>
							{NOMBRES[tipo]}
						</option>
					))}
				</select>
			</label>
			{biblioteca.error && (
				<p className="panel-aviso" role="alert">
					{biblioteca.error}
				</p>
			)}
			{biblioteca.cargando ? (
				<p>Cargando la biblioteca…</p>
			) : visibles.length === 0 ? (
				<p>
					Todavía no hay piezas guardadas. En el chat, usa «Guardar en
					biblioteca» debajo de un guion o una pieza.
				</p>
			) : (
				<ul className="biblioteca-lista">
					{visibles.map((entrada) => {
						const acciones = (
							<Acciones
								entrada={entrada}
								borrar={(id) => void biblioteca.borrar(id)}
							/>
						);
						return (
							<li key={entrada.id} className="panel-bloque">
								<FichaPanel
									seccion="Biblioteca"
									titulo={
										"pieza" in entrada
											? entrada.pieza.titulo
											: entrada.tarjeta.guion.titulo
									}
									resumen={NOMBRES[entrada.tipo]}
								>
									<p className="biblioteca-estado">
										Guardada el{" "}
										{new Date(entrada.creadoEn).toLocaleDateString("es-CO")}
									</p>
									{"pieza" in entrada ? (
										<TarjetaPieza pieza={entrada.pieza} acciones={acciones} />
									) : (
										<div className="agente-tarjeta">
											<h3>{entrada.tarjeta.guion.titulo}</h3>
											<p>
												{NOMBRES.guion} · {entrada.tarjeta.instruccion.red} ·{" "}
												{entrada.tarjeta.instruccion.duracion_s} segundos
											</p>
											<p className="agente-texto">
												{cuerpoGuion(entrada.tarjeta.guion)}
											</p>
											<div className="agente-acciones">{acciones}</div>
										</div>
									)}
								</FichaPanel>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}
