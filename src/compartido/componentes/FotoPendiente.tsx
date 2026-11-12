import { MarcaPorValidar } from "../../sitio/MarcaPorValidar";

/**
 * Espacio para una foto que todavía no existe: la figura de fresa sobre un
 * color de la paleta y la marca «Por validar». No se usan fotos de maqueta.
 */
export function FotoPendiente({
	color = "rosa",
	texto = "Foto por validar",
}: {
	color?: "rosa" | "verde" | "beige";
	texto?: string;
}) {
	return (
		<div className={`foto-pendiente fondo-${color}`}>
			<img src="/marca/fresa-flamingo.svg" alt="" width="72" height="102" />
			<span>{texto}</span>
			<MarcaPorValidar />
		</div>
	);
}
