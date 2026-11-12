import { AvisoRespaldo } from "./AvisoRespaldo";
import { ConContenido } from "./ConContenido";
import { Antojos } from "./inicio/Antojos";
import { Categorias } from "./inicio/Categorias";
import { Portada } from "./inicio/Portada";
import {
	Calificacion,
	LoMasReciente,
	Preguntas,
	Sedes,
} from "./inicio/Secciones";
import { MarcaPorValidar } from "./MarcaPorValidar";

/** Inicio: portada, selector de antojos, menú por categorías, reciente, calificación, sedes y preguntas. */
export function PaginaInicio() {
	return (
		<ConContenido>
			{(contenido, origen) => {
				const { presentacion, sedes } = contenido.negocio;
				return (
					<>
						{origen === "respaldo" && (
							<div className="envoltura">
								<AvisoRespaldo whatsapp={contenido.negocio.whatsapp} />
							</div>
						)}
						<AvisoDomicilio
							sede={sedes.find((s) => s.atiende_pedidos)?.nombre}
						/>
						<Portada
							titulo={presentacion.titulo}
							texto={presentacion.texto}
							sedes={sedes.length}
						/>
						<Antojos />
						<Categorias contenido={contenido} />
						<LoMasReciente contenido={contenido} />
						<Calificacion
							opiniones={contenido.opiniones}
							estado={contenido.estado}
						/>
						<Sedes contenido={contenido} />
						<Preguntas contenido={contenido} />
					</>
				);
			}}
		</ConContenido>
	);
}

/** Barra fina con el dato de domicilios: qué sede atiende pedidos. */
function AvisoDomicilio({ sede }: { sede: string | undefined }) {
	return (
		<div className="anuncio">
			<div className="envoltura">
				<p>
					Domicilios desde <strong>{sede ?? "nuestra sede"}</strong>, hasta 5 km{" "}
					<MarcaPorValidar />
				</p>
			</div>
		</div>
	);
}
