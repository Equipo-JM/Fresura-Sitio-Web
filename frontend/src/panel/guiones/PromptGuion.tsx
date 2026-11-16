import { useState } from "react";
import type { PromptVideo } from "./servicioGuiones";

/** Indicaciones separadas del texto que se pega en la herramienta externa de video. */
export function PromptGuion({
	aprobado,
	ocupado,
	prompt,
	generar,
	copiar,
}: {
	aprobado: boolean;
	ocupado: boolean;
	prompt: PromptVideo | null;
	generar: (herramienta: "avatar" | "escenas") => void;
	copiar: () => void;
}) {
	const [herramienta, setHerramienta] = useState<"avatar" | "escenas">(
		"avatar",
	);
	return (
		<section className="panel-seccion" aria-labelledby="prompt-titulo">
			<h3 id="prompt-titulo">Prompt de video</h3>
			<p>
				Un prompt es el texto que copias en otra herramienta para crear el
				video. Aquí no se crean ni publican videos.
			</p>
			{!aprobado && (
				<p>Guarda y aprueba el guion para generar un prompt de video.</p>
			)}
			<label>
				Clase de herramienta
				<select
					name="herramienta-video"
					disabled={ocupado}
					value={herramienta}
					onChange={(e) =>
						setHerramienta(e.target.value as "avatar" | "escenas")
					}
				>
					<option value="avatar">Avatar: un presentador digital</option>
					<option value="escenas">
						Escenas: un video descrito con palabras
					</option>
				</select>
			</label>
			{prompt && (
				<p>
					Generar otro prompt reemplaza el que está guardado, incluso si eliges
					otra clase de herramienta.
				</p>
			)}
			<button
				className="boton secundario"
				type="button"
				disabled={!aprobado || ocupado}
				onClick={() => generar(herramienta)}
			>
				Generar prompt de video
			</button>
			{prompt && (
				<div className="guiones-prompt">
					{prompt.herramienta && (
						<p>
							Prompt guardado para{" "}
							{prompt.herramienta === "avatar"
								? "un presentador digital"
								: "un video de escenas"}
							.
						</p>
					)}
					<h4>Estilo general</h4>
					<p>{prompt.estilo_general}</p>
					{prompt.escenas.map((e) => (
						<div key={e.orden}>
							<h4>Escena {e.orden}</h4>
							<p>{e.texto}</p>
							{e.indicaciones && (
								<>
									<h5>Indicaciones</h5>
									<p>{e.indicaciones}</p>
								</>
							)}
						</div>
					))}
					<label>
						Texto para copiar
						<textarea
							name="prompt-video"
							autoComplete="off"
							readOnly
							value={prompt.texto_copiar}
							rows={8}
						/>
					</label>
					<button
						className="boton secundario"
						type="button"
						disabled={ocupado}
						onClick={copiar}
					>
						Copiar prompt
					</button>
				</div>
			)}
		</section>
	);
}
