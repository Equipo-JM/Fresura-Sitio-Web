import type { SupabaseClient } from "@supabase/supabase-js";
import type { Contenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";
import type { Database } from "../../tipos/database.types";
import {
	Campo,
	Casilla,
	ErrorCampo,
	ListaCampos,
	Selector,
	useEdicion,
} from "./Campos";
import { completarIdentificadores } from "./edicionContenido";
import { FotoProducto } from "./FotoProducto";

/** Lista y edición de productos, manteniendo los retirados para las versiones conservadas. */
export function Productos({
	cliente,
	seleccion,
	setSeleccion,
}: {
	cliente: SupabaseClient<Database>;
	seleccion: number | null;
	setSeleccion: (indice: number) => void;
}) {
	const { contenido, cambiar } = useEdicion();
	const producto = seleccion === null ? null : contenido.productos[seleccion];
	const ruta = `productos.${seleccion}`;
	function agregar() {
		const nuevo: Contenido["productos"][number] = {
			id: "",
			nombre: "",
			descripcion: "",
			categoria: contenido.categorias[0]?.id ?? "",
			vigente: true,
			destacado: false,
			orden: contenido.productos.length,
			imagen: { ruta: "", alt: "", ancho: 1, alto: 1 },
			presentaciones: [{ id: "", nombre: "", descripcion: null, precio: null }],
			caracteristicas: [],
			grupos_opciones: [],
		};
		cambiar("productos", [...contenido.productos, nuevo]);
		setSeleccion(contenido.productos.length);
	}
	return (
		<section aria-labelledby="titulo-productos">
			<h2 id="titulo-productos">Productos</h2>
			<ErrorCampo ruta="productos" />
			{contenido.productos.length === 0 && (
				<p>
					Aún no hay productos. Agrega el primero para que aparezca en el sitio.
				</p>
			)}
			<ul>
				{contenido.productos.map((p, i) => (
					<li key={`producto-${i.toString()}`}>
						{p.nombre || "Producto nuevo"}{" "}
						{!p.vigente && <small>(oculto)</small>}{" "}
						<button
							className="boton-texto"
							type="button"
							aria-pressed={seleccion === i}
							onClick={() => setSeleccion(i)}
						>
							Editar {p.nombre || "producto nuevo"}
						</button>
					</li>
				))}
			</ul>
			<button className="boton secundario" type="button" onClick={agregar}>
				Agregar producto
			</button>
			{producto && (
				<fieldset className="panel-bloque">
					<legend>{producto.nombre || "Producto nuevo"}</legend>
					<Campo ruta={`${ruta}.nombre`} etiqueta="Nombre" maximo={80} />
					<Campo
						ruta={`${ruta}.descripcion`}
						etiqueta="Descripción"
						tipo="textarea"
						maximo={600}
					/>
					<Selector
						ruta={`${ruta}.categoria`}
						etiqueta="Categoría"
						opciones={completarIdentificadores(contenido).categorias.map(
							(c) => ({ valor: c.id, nombre: c.nombre }),
						)}
					/>
					<Campo
						ruta={`${ruta}.orden`}
						etiqueta="Orden en el menú"
						tipo="number"
					/>
					<Casilla ruta={`${ruta}.vigente`} etiqueta="Mostrar en el sitio" />
					<Casilla
						ruta={`${ruta}.destacado`}
						etiqueta="Destacar en el inicio"
					/>
					<FotoProducto key={ruta} ruta={ruta} cliente={cliente} />
					<Presentaciones indice={seleccion ?? 0} />
					<Opciones indice={seleccion ?? 0} />
					<ListaCampos
						ruta={`${ruta}.caracteristicas`}
						titulo="Característica"
						agregar={() =>
							cambiar(`${ruta}.caracteristicas`, [
								...producto.caracteristicas,
								"",
							])
						}
					>
						{producto.caracteristicas.map((_, i) => (
							<div key={`${ruta}.caracteristicas.${i.toString()}`}>
								<Campo
									ruta={`${ruta}.caracteristicas.${i}`}
									etiqueta={`Característica ${i + 1}`}
									maximo={80}
								/>
								<button
									className="boton-texto"
									type="button"
									onClick={() =>
										cambiar(
											`${ruta}.caracteristicas`,
											producto.caracteristicas.filter((_, j) => j !== i),
										)
									}
								>
									Quitar característica {i + 1}
								</button>
							</div>
						))}
					</ListaCampos>
				</fieldset>
			)}
		</section>
	);
}
function Presentaciones({ indice }: { indice: number }) {
	const { contenido, cambiar } = useEdicion();
	const producto = contenido.productos[indice];
	const ruta = `productos.${indice}.presentaciones`;
	return (
		<ListaCampos
			ruta={ruta}
			titulo="Presentación"
			agregar={() =>
				cambiar(ruta, [
					...producto.presentaciones,
					{ id: "", nombre: "", descripcion: null, precio: null },
				])
			}
		>
			<p>
				Precios en pesos enteros, sin puntos ni comas. Deja el precio vacío si
				está por confirmar.
			</p>
			{producto.presentaciones.map((p, i) => {
				const campo = `${ruta}.${i}`;
				return (
					<fieldset key={campo} className="panel-bloque">
						<legend>Presentación {i + 1}</legend>
						<Campo
							ruta={`${campo}.nombre`}
							etiqueta="Nombre de la presentación"
							maximo={40}
						/>
						<Campo
							ruta={`${campo}.descripcion`}
							etiqueta="Descripción de la presentación (opcional)"
							maximo={80}
							opcional
						/>
						<Campo
							ruta={`${campo}.precio`}
							etiqueta="Precio en pesos (vacío: por confirmar)"
							tipo="number"
							opcional
						/>
						{p.precio === null && <p>Precio por confirmar</p>}
						<button
							type="button"
							className="boton-texto"
							onClick={() =>
								cambiar(
									ruta,
									producto.presentaciones.filter((_, j) => j !== i),
								)
							}
						>
							Quitar presentación {i + 1}
						</button>
					</fieldset>
				);
			})}
		</ListaCampos>
	);
}
function Opciones({ indice }: { indice: number }) {
	const { contenido, cambiar } = useEdicion();
	const grupos = contenido.productos[indice].grupos_opciones;
	const ruta = `productos.${indice}.grupos_opciones`;
	return (
		<ListaCampos
			ruta={ruta}
			titulo="Grupo de opciones"
			agregar={() =>
				cambiar(ruta, [
					...grupos,
					{
						id: "",
						nombre: "",
						tipo: "una",
						obligatorio: false,
						maximo: 1,
						opciones: [{ id: "", nombre: "", adicional: 0 }],
					},
				])
			}
		>
			{grupos.map((grupo, i) => {
				const campo = `${ruta}.${i}`;
				return (
					<fieldset key={campo} className="panel-bloque">
						<legend>{grupo.nombre || `Grupo ${i + 1}`}</legend>
						<Campo
							ruta={`${campo}.nombre`}
							etiqueta="Nombre del grupo"
							maximo={40}
						/>
						<Selector
							ruta={`${campo}.tipo`}
							etiqueta="Cuántas opciones se pueden elegir"
							opciones={[
								{ valor: "una", nombre: "Una" },
								{ valor: "varias", nombre: "Varias" },
							]}
						/>
						<Casilla
							ruta={`${campo}.obligatorio`}
							etiqueta="Es obligatorio elegir"
						/>
						<Campo
							ruta={`${campo}.maximo`}
							etiqueta="Máximo de opciones"
							tipo="number"
						/>
						<ListaCampos
							ruta={`${campo}.opciones`}
							titulo="Opción"
							agregar={() =>
								cambiar(`${campo}.opciones`, [
									...grupo.opciones,
									{ id: "", nombre: "", adicional: 0 },
								])
							}
						>
							{grupo.opciones.map((_, j) => {
								const opcion = `${campo}.opciones.${j}`;
								return (
									<fieldset key={opcion} className="panel-bloque">
										<legend>Opción {j + 1}</legend>
										<Campo
											ruta={`${opcion}.nombre`}
											etiqueta="Nombre de la opción"
											maximo={40}
										/>
										<Campo
											ruta={`${opcion}.adicional`}
											etiqueta="Costo adicional en pesos (0: sin costo)"
											tipo="number"
										/>
										<button
											type="button"
											className="boton-texto"
											onClick={() =>
												cambiar(
													`${campo}.opciones`,
													grupo.opciones.filter((_, k) => k !== j),
												)
											}
										>
											Quitar opción {j + 1}
										</button>
									</fieldset>
								);
							})}
						</ListaCampos>
						<button
							type="button"
							className="boton-texto"
							onClick={() =>
								cambiar(
									ruta,
									grupos.filter((_, j) => j !== i),
								)
							}
						>
							Quitar grupo {grupo.nombre || i + 1}
						</button>
					</fieldset>
				);
			})}
		</ListaCampos>
	);
}
