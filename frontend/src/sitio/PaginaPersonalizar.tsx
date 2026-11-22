import { useState } from "react";
import { Link, useParams } from "react-router";
import { agregarLinea } from "../compartido/carrito/almacenCarrito";
import {
	type LineaCarrito,
	MAX_INDICACIONES,
	MAX_UNIDADES,
	nombreProducto,
	type Producto,
	pesos,
	precioLinea,
	puedeElegir,
	type Seleccion,
} from "../compartido/carrito/reglas";
import { Icono } from "../compartido/componentes/Icono";
import { volarAlCarrito } from "../compartido/movimiento/volarAlCarrito";
import { CompraDesactivada } from "./CompraDesactivada";
import { ConContenido } from "./ConContenido";
import { EscenaProducto } from "./EscenaProducto";
import { PERSONALIZACION } from "./inicio/copy";
import { PaginaNoEncontrada } from "./PaginaNoEncontrada";
import { useDialogoAgregado } from "./personalizar/useDialogoAgregado";
import { VasitosCantidad } from "./personalizar/VasitosCantidad";
import { VasoIlustrado } from "./personalizar/VasoIlustrado";

/** Pantalla «Ponle tu toque»: tamaño, opciones por grupo, cantidad y agregar al carrito. */
export function PaginaPersonalizar() {
	const { idProducto } = useParams();
	return (
		<ConContenido>
			{(contenido, origen) => {
				const producto = contenido.productos.find((p) => p.id === idProducto);
				if (!producto) {
					return <PaginaNoEncontrada />;
				}
				if (origen === "respaldo") {
					return <CompraDesactivada whatsapp={contenido.negocio.whatsapp} />;
				}
				return (
					<Personalizador
						key={producto.id}
						producto={producto}
						whatsapp={contenido.negocio.whatsapp}
						nombre={
							producto.nombre.startsWith("Arma tu")
								? producto.nombre
								: nombreProducto(producto, contenido.categorias)
						}
					/>
				);
			}}
		</ConContenido>
	);
}

/** Estado de la personalización de un producto. Se reinicia al cambiar de producto. */
function Personalizador({
	producto,
	nombre,
	whatsapp,
}: {
	producto: Producto;
	nombre: string;
	whatsapp: string;
}) {
	const [idPresentacion, setIdPresentacion] = useState(
		producto.presentaciones[0].id,
	);
	const [seleccion, setSeleccion] = useState<Seleccion>({});
	const [cantidad, setCantidad] = useState(1);
	const [indicaciones, setIndicaciones] = useState("");
	const [aviso, setAviso] = useState<string | null>(null);
	const [agregado, setAgregado] = useState(false);
	const dialogo = useDialogoAgregado(agregado);
	const presentacion =
		producto.presentaciones.find((p) => p.id === idPresentacion) ??
		producto.presentaciones[0];
	const incluye = producto.caracteristicas
		.find((c) => c.startsWith("Incluye "))
		?.replace(/^Incluye /, "");

	const linea: LineaCarrito = {
		idProducto: producto.id,
		idPresentacion,
		seleccion,
		cantidad,
		indicaciones,
	};
	const precio = precioLinea(producto, linea);
	// En esta pantalla no aparece el botón flotante (lo taparía la barra de
	// compra), así que WhatsApp va dentro del formulario (RF-08).
	const mensajeWhatsapp = encodeURIComponent(
		`Hola, Fresura. Tengo una pregunta sobre ${nombre}.`,
	);

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

	function agregar(boton: Element | null) {
		const error = agregarLinea({ ...linea, indicaciones: indicaciones.trim() });
		setAviso(error);
		if (error !== null || !boton) {
			setAgregado(false);
			return;
		}
		// El diálogo se abre al aterrizar la fresa en el carrito, para que se vea el vuelo.
		const vuelo = volarAlCarrito(boton);
		if (vuelo) vuelo.then(() => setAgregado(true));
		else setAgregado(true);
	}

	const elegidos = producto.grupos_opciones.flatMap((grupo) =>
		(seleccion[grupo.id] ?? []).map((id) => {
			const opcion = grupo.opciones.find((o) => o.id === id);
			return { grupo: grupo.nombre, nombre: opcion?.nombre ?? id };
		}),
	);
	const frase =
		elegidos.length === 0
			? PERSONALIZACION.inicio
			: elegidos.length < 4
				? PERSONALIZACION.frases[0]
				: elegidos.length < 7
					? PERSONALIZACION.frases[1]
					: PERSONALIZACION.frases[2];

	return (
		<section className="pagina-personalizar">
			<div className="envoltura pz">
				<div className="columna-visual">
					{producto.grupos_opciones.length === 0 ? (
						// Sin opciones que ilustrar, se muestra la misma escena de la ficha
						// y, debajo, la descripción en un boleto como el precio de la ficha.
						<EscenaProducto
							producto={producto}
							calcomanias={false}
							pie={
								producto.descripcion && (
									<div className="boleto boleto-descripcion">
										<span className="boleto-etiqueta">Lo que trae</span>
										<p>{producto.descripcion}</p>
									</div>
								)
							}
						/>
					) : (
						// La misma escena de la ficha, con el vaso que se arma en el arco
						// y la frase de avance en la etiqueta café.
						<EscenaProducto
							producto={producto}
							calcomanias={false}
							centro={
								<VasoIlustrado producto={producto} seleccion={seleccion} />
							}
							etiqueta={
								// La clave cambia con la frase para que la etiqueta vuelva
								// a saltar cada vez que avanza.
								<span className="frase-viva" key={frase}>
									{frase}
								</span>
							}
							pie={
								elegidos.length > 0 && (
									<ul className="stickers-lista" aria-label="Lo que llevas">
										{elegidos.map((e) => (
											<li className="sticker-op" key={`${e.grupo}-${e.nombre}`}>
												<span className="sticker-grupo">{e.grupo}</span>{" "}
												{e.nombre}
											</li>
										))}
									</ul>
								)
							}
						/>
					)}
				</div>

				<form
					className="pz-datos"
					onSubmit={(evento) => {
						evento.preventDefault();
						agregar(
							evento.currentTarget.querySelector(
								".compra-barra button[type=submit]",
							),
						);
					}}
				>
					<div className="pz-encabezado">
						<h1>{nombre}</h1>
						<p>
							{incluye
								? `Ponle tu toque único: ${presentacion.nombre} con ${incluye}.`
								: `${presentacion.nombre}. Elige la cantidad y déjanos tus indicaciones.`}
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
										<span className="op-marca" aria-hidden="true">
											<Icono nombre="ok" />
										</span>
										{p.nombre}
									</label>
								))}
							</div>
						</fieldset>
					)}

					<div className="grupos">
						{producto.grupos_opciones.map((grupo, indice) => {
							const elegidas = seleccion[grupo.id] ?? [];
							const lleno = elegidas.length >= grupo.maximo;
							const adicional = grupo.id === "adicionales";
							const precios = [
								...new Set(grupo.opciones.map((o) => o.adicional)),
							];
							return (
								<section
									className={`grupo fondo-${indice % 2 === 0 ? "peep" : "dust"}`}
									key={grupo.id}
									aria-labelledby={`grupo-${grupo.id}`}
								>
									<div className="grupo-cabeza">
										<h2 id={`grupo-${grupo.id}`}>{grupo.nombre}</h2>
										<span
											className={
												lleno && !adicional ? "cuenta cuenta-lista" : "cuenta"
											}
										>
											{adicional
												? `${elegidas.length} ${elegidas.length === 1 ? "elegido" : "elegidos"}`
												: `${lleno ? "Listo · " : ""}${elegidas.length} de ${grupo.maximo}`}
										</span>
									</div>
									<p className="ayuda">
										{adicional
											? precios.length === 1
												? `Opcional. ${pesos(precios[0])} cada uno.`
												: "Opcional. El precio aparece en cada opción."
											: `Elige hasta ${grupo.maximo} (opcional).`}
										{grupo.id === "base" ? ` ${PERSONALIZACION.base}` : ""}
										{lleno && !adicional
											? " Para cambiar uno, quita otro primero."
											: ""}
									</p>
									<div className="opciones-chips">
										{grupo.opciones.map((opcion) => {
											const marcada = elegidas.includes(opcion.id);
											const bloqueada = !puedeElegir(
												grupo,
												seleccion,
												opcion.id,
											);
											return (
												<button
													type="button"
													key={opcion.id}
													className="op"
													aria-pressed={marcada}
													aria-disabled={bloqueada}
													onClick={() => alternar(grupo.id, opcion.id)}
												>
													<span className="op-marca" aria-hidden="true">
														<Icono nombre="ok" />
													</span>
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
								</section>
							);
						})}
					</div>

					<section className="extra" aria-labelledby="titulo-cantidad">
						<h2 id="titulo-cantidad">Cantidad</h2>
						<div className="cantidad-fila">
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
							<VasitosCantidad cantidad={cantidad} />
						</div>
					</section>

					<section className="extra" aria-labelledby="titulo-indicaciones">
						<h2 id="titulo-indicaciones">
							<label htmlFor="indicaciones">Indicaciones</label>{" "}
							<span className="opc">(opcional)</span>
						</h2>
						<div className="campo">
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
					</section>

					<p className="pz-whatsapp">
						<a
							href={`https://wa.me/${whatsapp}?text=${mensajeWhatsapp}`}
							target="_blank"
							rel="noopener noreferrer"
						>
							<Icono nombre="chat" />
							¿Tienes dudas? Pregúntanos por WhatsApp
						</a>
					</p>

					{aviso && (
						<p className="alerta" role="alert">
							<Icono nombre="alerta" />
							<span>{aviso}</span>
						</p>
					)}

					<div className="compra-barra oscuro">
						<div className="envoltura">
							<div className="barra-texto">
								<span className="chico">
									{producto.nombre} × {cantidad}
								</span>
								<strong className="precio-barra">
									{/* La clave cambia con el precio para que vuelva a rebotar. */}
									<span className="precio-salta" key={precio ?? "sin-precio"}>
										{precio === null ? "Precio por confirmar" : pesos(precio)}
									</span>
								</strong>
							</div>
							<button className="boton" type="submit">
								<Icono nombre="carrito" />
								Agregar al carrito
							</button>
						</div>
					</div>

					{agregado && (
						<dialog
							id="dlg-agregado"
							aria-labelledby="dlg-agregado-t"
							ref={dialogo}
							onClose={() => setAgregado(false)}
							data-lenis-prevent
						>
							<div className="dlg-cuerpo hoja">
								<div className="sello-hoja" aria-hidden="true">
									¡A tu carrito!
								</div>
								<h2 id="dlg-agregado-t">
									Ya está <em>en tu carrito</em>
								</h2>
								<p>
									{nombre}, {presentacion.nombre} × {cantidad}
								</p>
								<div className="hoja-acciones">
									<Link className="boton secundario" to="/menu">
										Seguir comprando
									</Link>
									<Link className="boton" to="/carrito">
										Ver carrito
									</Link>
								</div>
								<button
									type="button"
									className="boton-texto"
									onClick={() => setAgregado(false)}
								>
									Seguir personalizando
								</button>
							</div>
						</dialog>
					)}
				</form>
			</div>
		</section>
	);
}
