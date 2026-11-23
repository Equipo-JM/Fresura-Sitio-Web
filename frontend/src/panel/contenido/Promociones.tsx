import { FichaPanel } from "../FichaPanel";
import { Campo, ErrorCampo, ListaCampos, useEdicion } from "./Campos";
import { completarIdentificadores } from "./edicionContenido";

/** Promociones conservadas después de vencer; el sitio aplica la vigencia en Colombia. */
export function Promociones() {
	const { contenido, cambiar } = useEdicion();
	return (
		<section aria-labelledby="titulo-promociones">
			<h2 id="titulo-promociones">Promociones</h2>
			<p>
				El sitio solo muestra las promociones dentro de su vigencia. Las
				vencidas se conservan aquí.
			</p>
			<ErrorCampo ruta="promociones" />
			{contenido.promociones.map((promocion, i) => {
				const ruta = `promociones.${i}`;
				return (
					<FichaPanel
						key={ruta}
						seccion="Promociones"
						titulo={promocion.titulo || "Promoción nueva"}
						resumen={
							promocion.vigencia.desde + " — " + promocion.vigencia.hasta
						}
					>
						<Campo ruta={`${ruta}.titulo`} etiqueta="Título" maximo={80} />
						<Campo
							ruta={`${ruta}.vigencia.desde`}
							etiqueta="Desde"
							tipo="date"
						/>
						<Campo
							ruta={`${ruta}.vigencia.hasta`}
							etiqueta="Hasta"
							tipo="date"
						/>
						<Campo
							ruta={`${ruta}.condiciones`}
							etiqueta="Restricciones y condiciones"
							tipo="textarea"
							maximo={400}
						/>
						<ListaCampos
							ruta={`${ruta}.productos`}
							titulo="Productos incluidos"
						>
							{completarIdentificadores(contenido).productos.map((producto) => (
								<label className="panel-aprobacion" key={producto.id}>
									<input
										type="checkbox"
										checked={promocion.productos.includes(producto.id)}
										onChange={(e) =>
											cambiar(
												`${ruta}.productos`,
												e.target.checked
													? [...promocion.productos, producto.id]
													: promocion.productos.filter(
															(id) => id !== producto.id,
														),
											)
										}
									/>
									{producto.nombre}
									{!producto.vigente && " (oculto)"}
								</label>
							))}
							{promocion.productos.map((_, j) => (
								<ErrorCampo
									key={`${ruta}.productos.${j.toString()}`}
									ruta={`${ruta}.productos.${j}`}
								/>
							))}
						</ListaCampos>
						<button
							type="button"
							className="boton-texto"
							onClick={() =>
								cambiar(
									"promociones",
									contenido.promociones.filter((_, j) => j !== i),
								)
							}
						>
							Quitar promoción {promocion.titulo}
						</button>
					</FichaPanel>
				);
			})}
			<button
				type="button"
				className="boton secundario"
				onClick={() =>
					cambiar("promociones", [
						...contenido.promociones,
						{
							id: "",
							titulo: "",
							productos: [],
							vigencia: { desde: "", hasta: "" },
							condiciones: "",
						},
					])
				}
			>
				Agregar promoción
			</button>
		</section>
	);
}
