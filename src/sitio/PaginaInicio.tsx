import { useEffect } from "react";
import { useLocation } from "react-router";
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
	const { hash } = useLocation();

	// Los enlaces del encabezado apuntan a secciones: al llegar, se baja hasta ella.
	useEffect(() => {
		if (!hash) return;
		document.getElementById(hash.slice(1))?.scrollIntoView();
	}, [hash]);

	return (
		<ConContenido>
			{(contenido) => {
				const { presentacion, sedes } = contenido.negocio;
				return (
					<>
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
