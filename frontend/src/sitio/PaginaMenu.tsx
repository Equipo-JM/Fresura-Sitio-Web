import { ConContenido } from "./ConContenido";
import { Categorias } from "./inicio/Categorias";

/** Menú completo por categorías (RF-02); el desplegable del encabezado enlaza cada categoría. */
export function PaginaMenu() {
	return (
		<ConContenido>
			{(contenido, origen) => (
				<>
					<div className="envoltura pagina-encabezado">
						<h1>
							Nuestro <em>menú</em>
						</h1>
						<p>Elige tu postre y arma tu pedido para enviarlo por WhatsApp.</p>
					</div>
					<Categorias contenido={contenido} respaldo={origen === "respaldo"} />
				</>
			)}
		</ConContenido>
	);
}
