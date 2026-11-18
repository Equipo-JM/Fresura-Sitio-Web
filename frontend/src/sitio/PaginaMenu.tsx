import { Calcomania } from "./Calcomania";
import { ConContenido } from "./ConContenido";
import { Antojos } from "./inicio/Antojos";
import { Categorias } from "./inicio/Categorias";

/**
 * Menú completo por categorías (RF-02). Abre con el selector «Hoy se me
 * antoja…» y, debajo, el título de la página; el desplegable del encabezado
 * enlaza cada categoría.
 */
export function PaginaMenu() {
	return (
		<ConContenido>
			{(contenido, origen) => (
				<>
					<Antojos />
					<div className="envoltura pagina-encabezado titulo-con-calcomania calcomania-menu">
						<h1>
							Nuestro <em>menú</em>
						</h1>
						<p>Elige tu postre y arma tu pedido para enviarlo por WhatsApp.</p>
						<Calcomania nombre="fresitas-fresotas-fresuras" />
					</div>
					<Categorias contenido={contenido} respaldo={origen === "respaldo"} />
				</>
			)}
		</ConContenido>
	);
}
