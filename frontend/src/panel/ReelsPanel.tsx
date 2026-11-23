import { useState } from "react";
import { codigosReels } from "../sitio/inicio/copy";
import { useEdicion } from "./contenido/Campos";

/** Edita la selección ordenada de la portada dentro de los cambios compartidos. */
export function ReelsPanel() {
	const { contenido, cambiar } = useEdicion();
	const reels = codigosReels(contenido);
	const [indice, setIndice] = useState<number | null>(null);
	const [enlace, setEnlace] = useState("");
	const [aviso, setAviso] = useState("");
	function editar(i: number) {
		setIndice(i);
		setEnlace(
			reels[i] ? "https://www.instagram.com/reel/" + reels[i] + "/" : "",
		);
		setAviso("");
	}
	function aplicar() {
		if (indice === null) return;
		let codigo: string | undefined;
		try {
			const url = new URL(enlace.trim());
			if (
				["https://instagram.com", "https://www.instagram.com"].includes(
					url.origin,
				)
			)
				codigo = url.pathname.match(/^\/reel\/([A-Za-z0-9_-]+)\/?$/)?.[1];
		} catch {
			/* El campo muestra la indicación para corregir el enlace. */
		}
		if (!codigo) {
			setAviso(
				"Pega un enlace de Instagram con el formato https://www.instagram.com/reel/código/.",
			);
			return;
		}
		if (reels.some((r, i) => r === codigo && i !== indice)) {
			setAviso("Este reel ya está en la lista.");
			return;
		}
		const lista = [...reels];
		lista[indice] = codigo;
		cambiar("reels", lista);
		setIndice(null);
		setAviso("");
	}
	function mover(i: number, paso: number) {
		const lista = [...reels];
		[lista[i], lista[i + paso]] = [lista[i + paso], lista[i]];
		cambiar("reels", lista);
	}
	return (
		<section aria-label="Reels de portada">
			<p>La portada muestra los reels en este orden.</p>
			<button
				className="boton"
				type="button"
				disabled={indice !== null}
				onClick={() => editar(reels.length)}
			>
				Agregar reel
			</button>
			{indice !== null && (
				<fieldset className="panel-bloque">
					<legend>
						{indice === reels.length ? "Nuevo reel" : "Cambiar reel"}
					</legend>
					<label>
						Enlace de Instagram
						<input
							type="url"
							value={enlace}
							onChange={(e) => setEnlace(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									aplicar();
								}
							}}
						/>
					</label>
					{aviso && <p role="alert">{aviso}</p>}
					<button type="button" className="boton" onClick={aplicar}>
						Aplicar enlace
					</button>
					<button
						type="button"
						className="panel-accion"
						onClick={() => setIndice(null)}
					>
						Cancelar
					</button>
				</fieldset>
			)}
			{!reels.length && <p>No hay reels seleccionados.</p>}
			<ol className="mesa-reels">
				{reels.map((codigo, i) => (
					<li key={codigo}>
						<div>
							<strong>Reel {i + 1}</strong>
							<br />
							<a
								href={`https://www.instagram.com/reel/${codigo}/`}
								target="_blank"
								rel="noreferrer"
							>
								{codigo} ↗
							</a>
						</div>
						<details className="reel-acciones" name="acciones-reel">
							<summary aria-label={`Acciones del reel ${i + 1}`}>
								Acciones <span aria-hidden="true">⌄</span>
							</summary>
							<div className="reel-opciones">
								<button
									type="button"
									disabled={indice !== null}
									onClick={() => editar(i)}
								>
									Cambiar
								</button>
								<button
									type="button"
									disabled={indice !== null || i === 0}
									onClick={() => mover(i, -1)}
								>
									Subir
								</button>
								<button
									type="button"
									disabled={indice !== null || i === reels.length - 1}
									onClick={() => mover(i, 1)}
								>
									Bajar
								</button>
								<button
									type="button"
									disabled={indice !== null}
									onClick={() =>
										cambiar(
											"reels",
											reels.filter((_, n) => n !== i),
										)
									}
								>
									Quitar
								</button>
							</div>
						</details>
					</li>
				))}
			</ol>
		</section>
	);
}
