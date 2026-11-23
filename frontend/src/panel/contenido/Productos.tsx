import type { SupabaseClient } from "@supabase/supabase-js";
import { useRef, useState } from "react";
import type { Contenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";

import type { Database } from "../../tipos/database.types";
import { FichaPanel } from "../FichaPanel";
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
	setSeleccion: (indice: number | null) => void;
}) {
	const { contenido, cambiar } = useEdicion();
	const producto = seleccion === null ? null : contenido.productos[seleccion];
	const ruta = `productos.${seleccion}`;
	const destinoFoco = useRef<"lista" | "editor" | null>(null);

	function seleccionar(indice: number | null) {
		destinoFoco.current = indice === null ? "lista" : "editor";
		setSeleccion(indice);
	}
	function enfocar(elemento: HTMLElement | null, destino: "lista" | "editor") {
		if (!elemento || destinoFoco.current !== destino) return;
		destinoFoco.current = null;
		elemento.focus();
	}
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
		seleccionar(contenido.productos.length);
	}
	return (
		<section aria-labelledby="titulo-productos">
			<div className="panel-productos-cabecera">
				<h2
					id="titulo-productos"
					tabIndex={-1}
					ref={(elemento) => enfocar(elemento, "lista")}
				>
					Productos
				</h2>
			</div>
			<ErrorCampo ruta="productos" />
			<CatalogoEditable
				agregar={agregar}
				contenido={contenido}
				seleccionar={seleccionar}
			/>
			{producto && (
				<FichaPanel
					directa
					seccion="Productos"
					titulo={producto.nombre || "Producto nuevo"}
					alCerrar={() => seleccionar(null)}
				>
					<Selector
						ruta={`${ruta}.categoria`}
						etiqueta="Categoría"
						opciones={completarIdentificadores(contenido).categorias.map(
							(c) => ({ valor: c.id, nombre: c.nombre }),
						)}
					/>
					<Campo ruta={`${ruta}.nombre`} etiqueta="Nombre" maximo={80} />
					<Campo
						ruta={`${ruta}.descripcion`}
						etiqueta="Descripción"
						tipo="textarea"
						maximo={600}
					/>

					<details>
						<summary>Imagen</summary>
						<FotoProducto key={ruta} ruta={ruta} cliente={cliente} />
					</details>
					<Casilla ruta={`${ruta}.vigente`} etiqueta="Mostrar en el sitio" />
					<Casilla
						ruta={`${ruta}.destacado`}
						etiqueta="Destacar en el inicio"
					/>
					<Campo
						ruta={`${ruta}.orden`}
						etiqueta="Orden en el menú"
						tipo="number"
					/>

					<details>
						<summary>Presentaciones · {producto.presentaciones.length}</summary>
						<Presentaciones indice={seleccion ?? 0} />
					</details>

					<details>
						<summary>
							Características · {producto.caracteristicas.length}
						</summary>
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
					</details>
					<details>
						<summary>
							Grupos de opciones · {producto.grupos_opciones.length}
						</summary>
						<Opciones indice={seleccion ?? 0} />
					</details>
				</FichaPanel>
			)}
		</section>
	);
}
function CatalogoEditable({
	agregar,
	contenido,
	seleccionar,
}: {
	contenido: Contenido;
	seleccionar: (indice: number) => void;
	agregar: () => void;
}) {
	const [consulta, setConsulta] = useState("");
	const [categoriaElegida, setCategoriaElegida] = useState("");
	const categorias = [...contenido.categorias].sort(
		(a, b) => a.orden - b.orden,
	);
	const grupos = new Map(
		categorias.map((categoria) => [
			categoria.id,
			{
				nombre: categoria.nombre || "Categoría nueva",
				indices: [] as number[],
			},
		]),
	);
	const sinCategoria = { nombre: "Sin categoría", indices: [] as number[] };
	contenido.productos.forEach((producto, indice) => {
		if (
			(categoriaElegida && categoriaElegida !== producto.categoria) ||
			!producto.nombre
				.toLocaleLowerCase("es")
				.includes(consulta.trim().toLocaleLowerCase("es"))
		)
			return;
		const grupo = grupos.get(producto.categoria) ?? sinCategoria;
		grupo.indices.push(indice);
	});
	const gruposVisibles = [...grupos.values(), sinCategoria].filter(
		(grupo) => grupo.indices.length > 0,
	);

	return (
		<>
			<div className="mesa-filtros">
				<label>
					<span className="oculto">Buscar producto</span>
					<input
						type="search"
						placeholder="Buscar por nombre…"
						value={consulta}
						onChange={(e) => setConsulta(e.target.value)}
					/>
				</label>
				<label>
					<span className="oculto">Filtrar por categoría</span>
					<select
						value={categoriaElegida}
						onChange={(e) => setCategoriaElegida(e.target.value)}
					>
						<option value="">Todas las categorías</option>
						{categorias.map((c) => (
							<option key={c.id} value={c.id}>
								{c.nombre}
							</option>
						))}
					</select>
				</label>
				<button
					className="boton"
					type="button"
					aria-label="Agregar producto"
					onClick={agregar}
				>
					+ Agregar
				</button>
			</div>
			{!gruposVisibles.length && (
				<p role="status">No hay productos que coincidan.</p>
			)}
			<div className="catalogo-filas">
				{gruposVisibles.map(({ nombre, indices }) => (
					<section
						key={indices[0]}
						className="catalogo-grupo"
						aria-labelledby={`grupo-productos-${indices[0]}`}
					>
						<h3 className="oculto" id={`grupo-productos-${indices[0]}`}>
							{nombre}
						</h3>
						<ul>
							{indices.map((indice) => {
								const producto = contenido.productos[indice];
								const nombreProducto = producto.nombre || "Producto nuevo";
								return (
									<li key={indice}>
										<button
											aria-label={`Editar ${nombreProducto}${producto.vigente ? "" : " (oculto)"}`}
											type="button"
											onClick={() => seleccionar(indice)}
										>
											<span>
												<strong>{nombreProducto}</strong>
												<small>{nombre}</small>
											</span>
											<span>
												{producto.vigente ? "En el menú" : "Oculto"} ↗
											</span>
										</button>
									</li>
								);
							})}
						</ul>
					</section>
				))}
			</div>
		</>
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
