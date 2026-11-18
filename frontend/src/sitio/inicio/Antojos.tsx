import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useCalcomaniaViva } from "../../compartido/movimiento/useCalcomaniaViva";
import { Calcomania } from "../Calcomania";
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
	const sticker = useRef<HTMLImageElement>(null);
	useCalcomaniaViva(sticker);

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
			<Calcomania
				nombre="fresitas-fresotas-fresuras"
				className="calcomania-corte corte-antojos"
			/>
			<div className="envoltura antojos">
				<img
					ref={sticker}
					className="antojos-sticker calcomania-viva"
					draggable={false}
					src="/marca/sticker-simbolo.svg"
					alt=""
					width="132"
					height="115"
				/>
				{/* Párrafo y no título: el selector va antes del h1 de /menu y un h2 ahí
				    rompería el orden de encabezados. La sección sigue nombrada por él. */}
				<p id="titulo-antojos" className="frase-antojo" tabIndex={-1}>
					Hoy se me antoja{" "}
					<span className="hueco" aria-live="polite">
						<span className="hueco-texto" key={elegido ?? "vacio"}>
							{elegido ?? "…"}
						</span>
					</span>
				</p>
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
