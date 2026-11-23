import { FichaPanel } from "../FichaPanel";
import { Campo, ErrorCampo, useEdicion } from "./Campos";

/** Categorías del menú; no permite quitar una que todavía use un producto. */
export function Categorias() {
	const { contenido, cambiar } = useEdicion();
	return (
		<section aria-labelledby="titulo-categorias">
			<h2 id="titulo-categorias">Categorías</h2>
			<ErrorCampo ruta="categorias" />
			{contenido.categorias.map((categoria, i) => {
				const ruta = `categorias.${i}`;
				const usada = contenido.productos.some(
					(p) => p.categoria === categoria.id,
				);
				return (
					<FichaPanel
						key={ruta}
						seccion="Categorías"
						titulo={categoria.nombre || "Categoría nueva"}
						resumen={"Orden " + categoria.orden}
					>
						<Campo
							ruta={`${ruta}.nombre`}
							etiqueta="Nombre de la categoría"
							maximo={40}
						/>
						<Campo ruta={`${ruta}.orden`} etiqueta="Orden" tipo="number" />
						{usada && (
							<p>
								Para quitarla, cambia primero la categoría de sus productos.
							</p>
						)}
						<button
							type="button"
							className="boton-texto"
							disabled={usada || contenido.categorias.length === 1}
							onClick={() =>
								cambiar(
									"categorias",
									contenido.categorias.filter((_, j) => j !== i),
								)
							}
						>
							Quitar categoría {categoria.nombre}
						</button>
					</FichaPanel>
				);
			})}
			<button
				type="button"
				className="boton secundario"
				onClick={() =>
					cambiar("categorias", [
						...contenido.categorias,
						{ id: "", nombre: "", orden: contenido.categorias.length },
					])
				}
			>
				Agregar categoría
			</button>
		</section>
	);
}
