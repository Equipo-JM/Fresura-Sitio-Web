import { useState } from "react";
import { useNavigate } from "react-router";
import { ANTOJOS } from "./copy";

/**
 * «Hoy se me antoja…», al inicio de /menu: elegir un antojo completa la frase
 * y baja a la categoría correspondiente. Solo cambia la frase; no hay movimiento automático.
 */
/** Mayúscula inicial para el óvalo; la frase «Hoy se me antoja…» conserva la minúscula. */
function conMayuscula(texto: string): string {
	return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function Antojos() {
	const [elegido, setElegido] = useState<string | null>(null);
	const navegar = useNavigate();

	function elegir(texto: string, categoria: string) {
		setElegido(texto);
		navegar(`/menu#cat-${categoria}`);
	}

	return (
		<section
			className="seccion antojos-sec"
			id="antojos"
			aria-labelledby="titulo-antojos"
		>
			<div className="envoltura antojos">
				<img
					className="antojos-sticker"
					src="/marca/sticker-simbolo.svg"
					alt=""
					width="132"
					height="115"
				/>
				<h2 id="titulo-antojos" className="frase-antojo" tabIndex={-1}>
					Hoy se me antoja{" "}
					<span className="hueco" aria-live="polite">
						<span className="hueco-texto" key={elegido ?? "vacio"}>
							{elegido ?? "…"}
						</span>
					</span>
				</h2>
				<ul className="lista-antojos">
					{ANTOJOS.map((antojo) => (
						<li key={antojo.texto}>
							<button
								type="button"
								className="antojo"
								aria-pressed={elegido === antojo.texto}
								onClick={() => elegir(antojo.texto, antojo.categoria)}
							>
								<span className="antojo-nombre">
									{conMayuscula(antojo.texto)}
								</span>
								<span className="antojo-dato">{antojo.detalle}</span>
							</button>
						</li>
					))}
				</ul>
				<p className="antojos-nota">
					Toca un antojo y te llevamos a esa parte del menú.
				</p>
			</div>
		</section>
	);
}
