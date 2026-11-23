import type { SupabaseClient } from "@supabase/supabase-js";
import { type FormEvent, useState } from "react";
import type { Database } from "../../tipos/database.types";
import { FichaPanel } from "../FichaPanel";
import { useReferenciasEstilo } from "./useReferenciasEstilo";

const REDES = {
	instagram: "Instagram",
	tiktok: "TikTok",
	facebook: "Facebook",
};
const FORMATOS = {
	video: "Video",
	carrusel: "Carrusel",
	foto: "Foto",
	historia: "Historia",
};

/**
 * Publicaciones recientes de Fresura que el agente lee para imitar su estilo.
 * Se pegan a mano; la importación con la API de Meta llegará después.
 */
export function EstiloRedesPanel({
	cliente,
}: {
	cliente: SupabaseClient<Database>;
}) {
	const estilo = useReferenciasEstilo(cliente);
	const [aviso, setAviso] = useState("");
	const [guardando, setGuardando] = useState(false);

	async function enviar(evento: FormEvent<HTMLFormElement>) {
		evento.preventDefault();
		const formulario = evento.currentTarget;
		const datos = new FormData(formulario);
		const texto = (nombre: string) => String(datos.get(nombre) ?? "").trim();
		setGuardando(true);
		const error = await estilo.agregar({
			red: texto("red"),
			formato: texto("formato"),
			enlace: texto("enlace") || null,
			texto: texto("texto"),
			publicada_en: texto("publicada_en") || null,
		});
		setGuardando(false);
		setAviso(error || "Referencia guardada. El agente ya la tiene en cuenta.");
		if (!error) formulario.reset();
	}

	return (
		<section className="panel-seccion" aria-labelledby="estilo-titulo">
			<h2 id="estilo-titulo">Estilo de redes</h2>
			<p>
				Pega aquí las últimas publicaciones de Fresura: el texto de la
				publicación o lo que se ve y se dice en el video. El agente las usa para
				imitar el tono, los ganchos y los hashtags, nunca para copiar precios ni
				promociones.
			</p>
			<FichaPanel seccion="Estilo de redes" titulo="Agregar referencia">
				<form className="panel-bloque estilo-formulario" onSubmit={enviar}>
					<label>
						Red
						<select name="red" defaultValue="instagram">
							{Object.entries(REDES).map(([valor, nombre]) => (
								<option key={valor} value={valor}>
									{nombre}
								</option>
							))}
						</select>
					</label>
					<label>
						Formato
						<select name="formato" defaultValue="video">
							{Object.entries(FORMATOS).map(([valor, nombre]) => (
								<option key={valor} value={valor}>
									{nombre}
								</option>
							))}
						</select>
					</label>
					<label>
						Enlace de la publicación (opcional)
						<input name="enlace" type="url" placeholder="https://" />
					</label>
					<label>
						Fecha de publicación (opcional)
						<input name="publicada_en" type="date" />
					</label>
					<label>
						Texto o descripción
						<textarea name="texto" rows={5} maxLength={3000} required />
					</label>
					<button className="boton" type="submit" disabled={guardando}>
						{guardando ? "Guardando…" : "Guardar referencia"}
					</button>
					<div role="status">{aviso}</div>
				</form>
			</FichaPanel>
			{estilo.error && (
				<p className="panel-aviso" role="alert">
					{estilo.error}
				</p>
			)}
			{estilo.cargando ? (
				<p>Cargando referencias…</p>
			) : estilo.referencias.length === 0 ? (
				<p>Todavía no hay referencias. Empieza por las tres más recientes.</p>
			) : (
				<ul className="biblioteca-lista">
					{estilo.referencias.map((referencia) => (
						<li key={referencia.id} className="panel-bloque">
							<p className="biblioteca-estado">
								{REDES[referencia.red]} · {FORMATOS[referencia.formato]}
								{referencia.publicada_en && ` · ${referencia.publicada_en}`}
							</p>
							<p className="agente-texto">{referencia.texto}</p>
							<div className="agente-acciones">
								{referencia.enlace && (
									<a href={referencia.enlace} target="_blank" rel="noreferrer">
										Ver publicación
										<span className="oculto"> (se abre en otra pestaña)</span>
									</a>
								)}
								<button
									className="boton-texto"
									type="button"
									onClick={() => void estilo.borrar(referencia.id)}
								>
									Borrar
								</button>
							</div>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
