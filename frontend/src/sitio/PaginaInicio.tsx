import { ConContenido } from "./ConContenido";
import { Destacados } from "./inicio/Destacados";
import { Explora } from "./inicio/Explora";
import { Portada } from "./inicio/Portada";
import { LoMasReciente } from "./inicio/Secciones";

/**
 * Inicio: portada, productos destacados, accesos a las demás páginas y lo más
 * reciente. El selector «Hoy se me antoja…» vive en /menu para no repetir la
 * franja Explora. El menú, las promociones, Nosotros, las sedes y la ayuda
 * tienen página propia (RF-02).
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
							sedes={sedes.map((s) => s.nombre)}
						/>
						<Destacados
							contenido={contenido}
							respaldo={origen === "respaldo"}
						/>
						<Explora contenido={contenido} respaldo={origen === "respaldo"} />
						<LoMasReciente contenido={contenido} />
					</>
				);
			}}
		</ConContenido>
	);
}
