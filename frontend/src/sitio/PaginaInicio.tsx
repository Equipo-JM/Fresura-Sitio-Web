import { ConContenido } from "./ConContenido";
import { Explora } from "./inicio/Explora";
import { Portada } from "./inicio/Portada";
import { LoMasReciente } from "./inicio/Secciones";

/**
 * Inicio: portada, accesos a las demás páginas y lo más reciente. El
 * selector «Hoy se me antoja…» vive en /menu para no repetir la franja Explora. El menú, las promociones, Nosotros, las sedes y la ayuda tienen
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
						<Explora contenido={contenido} respaldo={origen === "respaldo"} />
						<LoMasReciente contenido={contenido} />
					</>
				);
			}}
		</ConContenido>
	);
}
