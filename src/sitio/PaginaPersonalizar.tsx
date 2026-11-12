import { useState } from "react";
import { Link, useParams } from "react-router";
import { agregarLinea } from "../compartido/carrito/almacenCarrito";
import {
	type LineaCarrito,
	MAX_INDICACIONES,
	MAX_UNIDADES,
	type Producto,
	pesos,
	precioLinea,
	puedeElegir,
	type Seleccion,
} from "../compartido/carrito/reglas";
import { Icono } from "../compartido/componentes/Icono";
import { AvisoRespaldo } from "./AvisoRespaldo";
import { ConContenido } from "./ConContenido";
import { MarcaPorValidar } from "./MarcaPorValidar";
import { VasoIlustrado } from "./personalizar/VasoIlustrado";

/** Pantalla «Ponle tu toque»: tamaño, opciones por grupo, cantidad y agregar al carrito. */
export function PaginaPersonalizar() {
	const { idProducto } = useParams();
	return (
		<ConContenido>
			{(contenido, origen) => {
				const producto = contenido.productos.find((p) => p.id === idProducto);
				if (!producto) {
					return (
						<section className="pagina">
							<div className="envoltura texto-largo">
								<h1>No encontramos este producto</h1>
								<Link className="boton" to="/#menu">
									Volver al menú
								</Link>
							</div>
						</section>
					);
				}
				if (origen === "respaldo") {
					return (
						<section className="pagina">
							<div className="envoltura texto-largo">
								<h1>{producto.nombre}</h1>
								<AvisoRespaldo
									whatsapp={contenido.negocio.whatsapp}
									mensaje={`Hola, Fresura. Quiero pedir ${producto.nombre}.`}
								/>
							</div>
						</section>
					);
				}
				return <Personalizador key={producto.id} producto={producto} />;
			}}
		</ConContenido>
	);
}

/** Estado de la personalización de un producto. Se reinicia al cambiar de producto. */
function Personalizador({ producto }: { producto: Producto }) {
	const [idPresentacion, setIdPresentacion] = useState(
		producto.presentaciones[0].id,
	);
	const [seleccion, setSeleccion] = useState<Seleccion>({});
	const [cantidad, setCantidad] = useState(1);
	const [indicaciones, setIndicaciones] = useState("");
	const [aviso, setAviso] = useState<string | null>(null);
	const [agregado, setAgregado] = useState(false);

	const linea: LineaCarrito = {
		idProducto: producto.id,
		idPresentacion,
		seleccion,
		cantidad,
		indicaciones,
	};
	const precio = precioLinea(producto, linea);

	// El aviso «¡Ya está en tu carrito!» describe lo último agregado: si la
	// persona cambia algo después, deja de ser cierto y se oculta.
	function cambiar<T>(fijar: (valor: T) => void) {
		return (valor: T) => {
			fijar(valor);
			setAgregado(false);
			setAviso(null);
		};
	}
	const elegirPresentacion = cambiar(setIdPresentacion);
	const fijarCantidad = cambiar(setCantidad);
	const fijarIndicaciones = cambiar(setIndicaciones);

	function alternar(grupoId: string, idOpcion: string) {
		const grupo = producto.grupos_opciones.find((g) => g.id === grupoId);
		if (!grupo) return;
		const actuales = seleccion[grupoId] ?? [];
		if (!puedeElegir(grupo, seleccion, idOpcion)) return;
		const nuevas = actuales.includes(idOpcion)
			? actuales.filter((id) => id !== idOpcion)
			: [...actuales, idOpcion];
		setSeleccion({ ...seleccion, [grupoId]: nuevas });
		setAgregado(false);
		setAviso(null);
	}

	function agregar() {
		const error = agregarLinea({ ...linea, indicaciones: indicaciones.trim() });
		setAviso(error);
		setAgregado(error === null);
	}

	const elegidos = producto.grupos_opciones.flatMap((grupo) =>
		(seleccion[grupo.id] ?? []).map((id) => {
			const opcion = grupo.opciones.find((o) => o.id === id);
			return { grupo: grupo.nombre, nombre: opcion?.nombre ?? id };
		}),
	);

	return (
		<section className="pagina">
			<div className="envoltura pz">
				<div className="columna-visual">
					<div className="visual">
						<span className="pv pv-foto">Propuesta</span>
						{producto.grupos_opciones.length > 0 ? (
							<VasoIlustrado producto={producto} seleccion={seleccion} />
						) : (
							<div className="visual-foto">
								<p className="visual-simple">{producto.nombre}</p>
							</div>
						)}
						<ul className="stickers-lista" aria-label="Lo que llevas">
							{elegidos.map((e) => (
								<li className="sticker-op" key={`${e.grupo}-${e.nombre}`}>
									<span className="sticker-grupo">{e.grupo}</span> {e.nombre}
								</li>
							))}
						</ul>
					</div>
				</div>

				<form
					className="pz-datos"
					onSubmit={(evento) => {
						evento.preventDefault();
						agregar();
					}}
				>
					<div className="pz-encabezado">
						<h1>{producto.nombre}</h1>
						<p>
							Ponle tu toque único. <MarcaPorValidar />
						</p>
					</div>

					{producto.presentaciones.length > 1 && (
						<fieldset className="grupo fondo-peep">
							<legend>Tamaño (obligatorio)</legend>
							<div className="opciones-chips">
								{producto.presentaciones.map((p) => (
									<label className="op" key={p.id}>
										<input
											type="radio"
											name="tamano"
											className="oculto"
											value={p.id}
											checked={idPresentacion === p.id}
											onChange={() => elegirPresentacion(p.id)}
										/>
										{p.nombre}
									</label>
								))}
							</div>
						</fieldset>
					)}

					{producto.grupos_opciones.map((grupo) => {
						const elegidas = seleccion[grupo.id] ?? [];
						const lleno = elegidas.length >= grupo.maximo;
						return (
							<fieldset className="grupo fondo-dust" key={grupo.id}>
								<legend>
									{grupo.nombre} <span className="opc">(opcional)</span>
								</legend>
								<div className="grupo-cabeza">
									<span className="cuenta">
										{lleno ? "Listo · " : ""}
										{elegidas.length} de {grupo.maximo}
									</span>
								</div>
								<p className="ayuda">
									Elige hasta {grupo.maximo}.
									{lleno ? " Para cambiar uno, quita otro primero." : ""}
								</p>
								<div className="opciones-chips">
									{grupo.opciones.map((opcion) => {
										const marcada = elegidas.includes(opcion.id);
										const bloqueada = !puedeElegir(grupo, seleccion, opcion.id);
										return (
											<button
												type="button"
												key={opcion.id}
												className="op"
												aria-pressed={marcada}
												aria-disabled={bloqueada}
												onClick={() => alternar(grupo.id, opcion.id)}
											>
												{marcada && <Icono nombre="ok" />}
												{opcion.nombre}
												{opcion.adicional > 0 && (
													<span className="costo">
														+{pesos(opcion.adicional)}
													</span>
												)}
											</button>
										);
									})}
								</div>
							</fieldset>
						);
					})}

					<div className="extra">
						<h2>Cantidad e indicaciones</h2>
						<fieldset className="paso-cantidad" aria-label="Cantidad">
							<button
								type="button"
								className="redondo"
								aria-label="Quitar una unidad"
								disabled={cantidad <= 1}
								onClick={() => fijarCantidad(Math.max(1, cantidad - 1))}
							>
								<Icono nombre="menos" />
							</button>
							<span className="num" aria-live="polite">
								{cantidad}
							</span>
							<button
								type="button"
								className="redondo"
								aria-label="Agregar una unidad"
								disabled={cantidad >= MAX_UNIDADES}
								onClick={() =>
									fijarCantidad(Math.min(MAX_UNIDADES, cantidad + 1))
								}
							>
								<Icono nombre="mas" />
							</button>
						</fieldset>
						<div className="campo">
							<label htmlFor="indicaciones">
								Indicaciones <span className="opc">(opcional)</span>
							</label>
							<textarea
								id="indicaciones"
								maxLength={MAX_INDICACIONES}
								value={indicaciones}
								onChange={(e) => fijarIndicaciones(e.target.value)}
								aria-describedby="indicaciones-cuenta"
							/>
							<span className="contador-c" id="indicaciones-cuenta">
								{indicaciones.length} de {MAX_INDICACIONES}
							</span>
						</div>
					</div>

					{aviso && (
						<p className="alerta" role="alert">
							<Icono nombre="alerta" />
							<span>{aviso}</span>
						</p>
					)}

					<div className="barra-pedido">
						<div className="barra-texto">
							<span className="chico">Precio estimado</span>
							<strong className="precio-barra">
								{precio === null ? "Consulta por WhatsApp" : pesos(precio)}
							</strong>
						</div>
						<button className="boton" type="submit">
							<Icono nombre="carrito" />
							Agregar al carrito
						</button>
					</div>

					{agregado && (
						<div className="agregado" role="status">
							<p>
								<strong>¡Ya está en tu carrito!</strong> {producto.nombre} ×{" "}
								{cantidad}
							</p>
							<div className="acciones">
								<Link className="boton secundario" to="/#menu">
									Seguir comprando
								</Link>
								<Link className="boton" to="/carrito">
									Ver carrito
								</Link>
							</div>
						</div>
					)}
				</form>
			</div>
		</section>
	);
}
