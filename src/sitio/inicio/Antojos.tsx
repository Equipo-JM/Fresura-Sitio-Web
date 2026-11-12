import { useState } from "react";
import { Link } from "react-router";
import { desplazarA } from "../../compartido/movimiento/desplazar";
import { ANTOJOS } from "./copy";

/**
 * «Hoy se me antoja…»: elegir un antojo completa la frase y lleva a la categoría
 * correspondiente. Solo cambia la frase; no hay movimiento automático.
 */
export function Antojos() {
	const [elegido, setElegido] = useState<string | null>(null);

	function elegir(texto: string, categoria: string) {
		setElegido(texto);
		const destino = document.getElementById(`cat-${categoria}`);
		if (destino) desplazarA(destino, true);
	}

	return (
		<section
			className="seccion antojos-sec"
			id="antojos"
			aria-labelledby="titulo-antojos"
		>
			<div className="envoltura antojos">
				<p className="antetitulo">¿No sabes qué pedir?</p>
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
								<span className="antojo-nombre">{antojo.texto}</span>
								<span className="antojo-dato">{antojo.detalle}</span>
							</button>
						</li>
					))}
				</ul>
				<p className="chico">
					Toca un antojo y te llevamos a esa parte del menú.{" "}
					<Link to="/#menu">Ver todo el menú</Link>
				</p>
			</div>
		</section>
	);
}
