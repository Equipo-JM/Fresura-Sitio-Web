import { ConContenido } from "./ConContenido";
import { Preguntas } from "./inicio/Secciones";

/** Preguntas frecuentes (RF-02). */
export function PaginaAyuda() {
	return (
		<ConContenido>
			{(contenido) => <Preguntas contenido={contenido} comoPagina />}
		</ConContenido>
	);
}
