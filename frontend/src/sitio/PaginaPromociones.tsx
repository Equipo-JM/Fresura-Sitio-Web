import { ConContenido } from "./ConContenido";
import { Promociones } from "./inicio/Presentacion";

/** Promociones publicadas con su vigencia, productos y condiciones (RF-02, RNF-16). */
export function PaginaPromociones() {
	return (
		<ConContenido>
			{(contenido) => <Promociones contenido={contenido} comoPagina />}
		</ConContenido>
	);
}
