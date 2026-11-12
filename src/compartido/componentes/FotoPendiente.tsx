import { MarcaPorValidar } from "../../sitio/MarcaPorValidar";
import { Icono } from "./Icono";

/**
 * Espacio para una foto que todavía no existe. Se ve como un hueco de imagen
 * (textura, marco punteado e icono de foto) para que nadie lo confunda con
 * texto. Cuando el producto tenga su foto en el contenido, la tarjeta la
 * muestra en lugar de este espacio. No se usan fotos de maqueta (DD-43).
 */
export function FotoPendiente({
	color = "rosa",
	texto = "Foto del producto",
}: {
	color?: "rosa" | "verde" | "beige";
	texto?: string;
}) {
	return (
		<div className={`foto-pendiente tinte-${color}`}>
			<span className="foto-pendiente-marco" aria-hidden="true" />
			<span className="foto-pendiente-icono" aria-hidden="true">
				<Icono nombre="foto" />
			</span>
			{texto && <span className="foto-pendiente-texto">{texto}</span>}
			<MarcaPorValidar />
		</div>
	);
}
