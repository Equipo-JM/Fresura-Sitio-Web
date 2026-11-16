import { ConContenido } from "./ConContenido";
import { Antojos } from "./inicio/Antojos";
import { Categorias } from "./inicio/Categorias";
import { Portada } from "./inicio/Portada";
import { Nosotros, Promociones } from "./inicio/Presentacion";
import {
	Calificacion,
	LoMasReciente,
	Preguntas,
	Sedes,
} from "./inicio/Secciones";

/** Inicio: portada, selector de antojos, menú por categorías, reciente, calificación, sedes y preguntas. */
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
						{origen === "principal" && <Promociones contenido={contenido} />}
						<Categorias
							contenido={contenido}
							respaldo={origen === "respaldo"}
						/>
						<Nosotros />
						<Calificacion
							opiniones={contenido.opiniones}
							estado={contenido.estado}
						/>
						<Sedes contenido={contenido} />
						<LoMasReciente contenido={contenido} />
						<Preguntas contenido={contenido} />
					</>
				);
			}}
		</ConContenido>
	);
}
