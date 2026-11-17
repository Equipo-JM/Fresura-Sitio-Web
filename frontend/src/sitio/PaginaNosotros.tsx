import { ConContenido } from "./ConContenido";
import { Nosotros } from "./inicio/Presentacion";
import { Calificacion } from "./inicio/Secciones";

/** Historia, valores y calificación de Fresura (RF-02, RF-12). */
export function PaginaNosotros() {
	return (
		<ConContenido>
			{(contenido) => (
				<>
					<Nosotros comoPagina />
					<Calificacion
						opiniones={contenido.opiniones}
						estado={contenido.estado}
					/>
				</>
			)}
		</ConContenido>
	);
}
