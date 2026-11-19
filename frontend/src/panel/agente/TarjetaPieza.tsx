import { type ReactNode, useState } from "react";
import {
	HERRAMIENTA_PIEZA,
	NOMBRE_PIEZA,
	type Pieza,
	promptPieza,
	textoPieza,
} from "../../../../backend/supabase/functions/_shared/esquemas/pieza";

const REDES = {
	instagram: "Instagram",
	tiktok: "TikTok",
	facebook: "Facebook",
};

/**
 * Pieza entregada por el agente. Si se usa en otra herramienta, ofrece copiar
 * solo el prompt y abrir esa herramienta en otra pestaña con el prompt copiado.
 */
export function TarjetaPieza({
	pieza,
	acciones,
}: {
	pieza: Pieza;
	/** Acciones extra del contexto, como guardar en la biblioteca. */
	acciones?: ReactNode;
}) {
	const [aviso, setAviso] = useState("");
	const herramienta = HERRAMIENTA_PIEZA[pieza.tipo];

	async function copiar(texto: string, mensaje: string) {
		try {
			await navigator.clipboard.writeText(texto);
			setAviso(mensaje);
		} catch {
			setAviso("Selecciona el texto y usa la opción Copiar de tu dispositivo.");
		}
	}

	return (
		<div className="agente-tarjeta agente-pieza">
			<h3>{pieza.titulo}</h3>
			<p>
				{NOMBRE_PIEZA[pieza.tipo]}
				{pieza.red && ` · ${REDES[pieza.red]}`}
			</p>
			{pieza.bloques.map((bloque) => (
				<div key={bloque.etiqueta + bloque.texto}>
					<h4>{bloque.etiqueta}</h4>
					<p className="agente-texto">{bloque.texto}</p>
					{/* AI Avatar tiene un campo para lo hablado y otro para el movimiento. */}
					{pieza.tipo === "prompt_avatar_dreamina" &&
						bloque.etiqueta !== "Cómo usar" && (
							<button
								className="boton secundario compacto"
								type="button"
								onClick={() =>
									void copiar(bloque.texto, `${bloque.etiqueta}: copiado.`)
								}
							>
								Copiar {bloque.etiqueta}
							</button>
						)}
				</div>
			))}
			<div className="agente-acciones">
				<button
					className="boton secundario compacto"
					type="button"
					onClick={() =>
						void copiar(
							herramienta ? promptPieza(pieza) : textoPieza(pieza),
							herramienta ? "Prompt copiado." : "Texto copiado.",
						)
					}
				>
					{herramienta ? "Copiar prompt" : "Copiar texto"}
				</button>
				{herramienta && (
					// Se copia en el mismo clic que abre la pestaña: el navegador solo
					// permite escribir en el portapapeles durante un gesto de la persona.
					<a
						className="boton compacto"
						href={herramienta.url}
						target="_blank"
						rel="noreferrer"
						onClick={() =>
							void copiar(
								promptPieza(pieza),
								`Prompt copiado. Pégalo en ${herramienta.nombre}.`,
							)
						}
					>
						Copiar y abrir {herramienta.nombre}
						<span className="oculto"> (se abre en otra pestaña)</span>
					</a>
				)}
				{acciones}
			</div>
			<div role="status">{aviso}</div>
		</div>
	);
}
