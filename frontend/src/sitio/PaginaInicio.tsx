import { ConContenido } from "./ConContenido";
import { Antojos } from "./inicio/Antojos";
import { Explora } from "./inicio/Explora";
import { Portada } from "./inicio/Portada";
import { LoMasReciente } from "./inicio/Secciones";

/**
 * Inicio: portada, selector de antojos, accesos a las demás páginas y lo más
 * reciente. El menú, las promociones, Nosotros, las sedes y la ayuda tienen
 * página propia (RF-02).
 */
export function PaginaInicio() {
	return (
		<ConContenido>
			{(contenido, origen) => {
				const { presentacion, sedes } = contenido.negocio;
				return (
					<>
						<Portada
							titulo={presentacion.titulo}
							texto={presentacion.texto}
							sedes={sedes.map((s) => s.nombre)}
						/>
						<Antojos />
						<Explora contenido={contenido} respaldo={origen === "respaldo"} />
						<LoMasReciente contenido={contenido} />
					</>
				);
			}}
		</ConContenido>
	);
}
