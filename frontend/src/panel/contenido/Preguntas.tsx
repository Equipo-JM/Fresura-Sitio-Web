import { FichaPanel } from "../FichaPanel";
import { Campo, ErrorCampo, useEdicion } from "./Campos";

/** Preguntas y respuestas aprobadas al publicar, con su orden visible. */
export function Preguntas() {
	const { contenido, cambiar } = useEdicion();
	const lista = contenido.preguntas_frecuentes;
	return (
		<section aria-labelledby="titulo-preguntas">
			<h2 id="titulo-preguntas">Preguntas frecuentes</h2>
			<ErrorCampo ruta="preguntas_frecuentes" />
			{lista.map((pregunta, i) => {
				const ruta = `preguntas_frecuentes.${i}`;
				return (
					<FichaPanel
						key={ruta}
						seccion="Preguntas frecuentes"
						titulo={pregunta.pregunta || "Pregunta nueva"}
						resumen={pregunta.respuesta}
					>
						<Campo ruta={`${ruta}.pregunta`} etiqueta="Pregunta" maximo={200} />
						<Campo
							ruta={`${ruta}.respuesta`}
							etiqueta="Respuesta"
							tipo="textarea"
							maximo={1000}
						/>
						<Campo ruta={`${ruta}.orden`} etiqueta="Orden" tipo="number" />
						<button
							type="button"
							className="boton-texto"
							onClick={() =>
								cambiar(
									"preguntas_frecuentes",
									lista.filter((_, j) => j !== i),
								)
							}
						>
							Quitar pregunta {pregunta.pregunta}
						</button>
					</FichaPanel>
				);
			})}
			<button
				type="button"
				className="boton secundario"
				onClick={() =>
					cambiar("preguntas_frecuentes", [
						...lista,
						{ id: "", pregunta: "", respuesta: "", orden: lista.length },
					])
				}
			>
				Agregar pregunta
			</button>
		</section>
	);
}
