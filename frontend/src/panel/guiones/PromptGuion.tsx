import { useRef, useState } from "react";
import type { HerramientaVideo } from "../../../../backend/supabase/functions/_shared/esquemas/prompt-video";
import type { PromptVideo } from "./servicioGuiones";

function PromptCompleto({
	prompt,
	ocupado,
}: {
	prompt: PromptVideo;
	ocupado: boolean;
}) {
	const campo = useRef<HTMLTextAreaElement>(null);
	const [mensaje, setMensaje] = useState("");
	async function copiar() {
		try {
			await navigator.clipboard.writeText(prompt.texto_copiar);
			setMensaje("Prompt completo copiado.");
		} catch {
			campo.current?.focus();
			campo.current?.select();
			setMensaje(
				"Prompt seleccionado. Usa la opción Copiar de tu dispositivo.",
			);
		}
	}
	return (
		<div className="guiones-prompt">
			<div className="guiones-prompt-acciones">
				<button
					className="boton secundario"
					type="button"
					disabled={ocupado}
					onClick={() => void copiar()}
				>
					Copiar prompt completo
				</button>
				<span role="status">{mensaje}</span>
			</div>
			<label>
				{prompt.herramienta === "avatar"
					? "Prompt completo para avatar"
					: prompt.herramienta === "escenas"
						? "Prompt completo para escenas"
						: "Prompt completo"}
				<textarea
					ref={campo}
					name="prompt-video"
					autoComplete="off"
					readOnly
					value={prompt.texto_copiar}
					rows={10}
				/>
			</label>
		</div>
	);
}

/** Genera y presenta el prompt listo para copiar como un solo bloque. */
export function PromptGuion({
	aprobado,
	ocupado,
	prompt,
	generar,
}: {
	aprobado: boolean;
	ocupado: boolean;
	prompt: PromptVideo | null;
	generar: (herramienta: HerramientaVideo) => void;
}) {
	const [herramienta, setHerramienta] = useState<HerramientaVideo>("avatar");
	return (
		<section
			className="panel-seccion guiones-prompt"
			aria-labelledby="prompt-titulo"
		>
			<h3 id="prompt-titulo">Prompt de video</h3>
			{!aprobado && (
				<p>Guarda y aprueba el guion para generar un prompt de video.</p>
			)}
			<label>
				Clase de herramienta
				<select
					name="herramienta-video"
					disabled={ocupado}
					value={herramienta}
					onChange={(e) => setHerramienta(e.target.value as HerramientaVideo)}
				>
					<option value="avatar">Avatar: un presentador digital</option>
					<option value="escenas">
						Escenas: un video descrito con palabras
					</option>
				</select>
			</label>
			{prompt && <p>Generar otro prompt reemplaza el que está guardado.</p>}
			<button
				className="boton secundario"
				type="button"
				disabled={!aprobado || ocupado}
				onClick={() => generar(herramienta)}
			>
				Generar prompt de video
			</button>
			{prompt && (
				<PromptCompleto
					key={prompt.texto_copiar}
					prompt={prompt}
					ocupado={ocupado}
				/>
			)}
		</section>
	);
}
