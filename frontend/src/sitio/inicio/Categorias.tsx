import { type ReactNode, useCallback, useRef, useState } from "react";
import { Link } from "react-router";
import type { Contenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";
import { nombreProducto } from "../../compartido/carrito/reglas";
import { Icono } from "../../compartido/componentes/Icono";
import { useCambioAnimado } from "../../compartido/movimiento/useCambioAnimado";
import { FotoProducto } from "../FotoProducto";
import { useEsMovil } from "../useEsMovil";
import { Abanico, FresaPosicion, precioDesde } from "./Abanico";
import { CarrilProductos } from "./CarrilProductos";
import { DATOS_CATEGORIAS, FRASES_CATEGORIAS } from "./copy";
import { useAutoavance } from "./useAutoavance";

type Producto = Contenido["productos"][number];

/**
 * Menú completo: una sección por categoría, en el orden del contrato. En
 * escritorio cada una es una vitrina con abanico; en celular, el mismo
 * encabezado y un carril deslizable para ver los productos en la misma pantalla.
 */
export function Categorias({
	contenido,
	respaldo = false,
}: {
	contenido: Contenido;
	respaldo?: boolean;
}) {
	const esMovil = useEsMovil();
	const categorias = [...contenido.categorias].sort(
		(a, b) => a.orden - b.orden,
	);
	return (
		<div id="menu">
			{categorias.map((categoria, indice) => {
				const productos = contenido.productos
					.filter((p) => p.categoria === categoria.id && p.vigente)
					.sort((a, b) => a.orden - b.orden);
				if (productos.length === 0) return null;
				const tamanos = productos[0].presentaciones
					.map((p) => p.nombre)
					.join(", ");
				const encabezado = (
					<div className="capa-encabezado">
						<h2 id={`titulo-${categoria.id}`} tabIndex={-1}>
							{categoria.nombre}
						</h2>
						{FRASES_CATEGORIAS[categoria.id] && (
							<p className="capa-frase">{FRASES_CATEGORIAS[categoria.id]}</p>
						)}
						<p className="capa-dato">
							{DATOS_CATEGORIAS[categoria.id] ?? tamanos}
						</p>
					</div>
				);
				return (
					<section
						key={categoria.id}
						id={`cat-${categoria.id}`}
						className={`seccion capa ${indice % 2 === 1 ? "fondo-dust" : ""}`}
						aria-labelledby={`titulo-${categoria.id}`}
					>
						{esMovil ? (
							<div className="envoltura vitrina-texto capa-movil">
								{encabezado}
								<CarrilProductos
									productos={productos}
									categorias={contenido.categorias}
									respaldo={respaldo}
									etiqueta={`Productos de ${categoria.nombre}`}
								/>
							</div>
						) : (
							<Vitrina
								productos={productos}
								categorias={contenido.categorias}
								respaldo={respaldo}
							>
								{encabezado}
							</Vitrina>
						)}
					</section>
				);
			})}
		</div>
	);
}

/**
 * Una categoría del menú en vitrina: a la izquierda el encabezado (`children`)
 * y el producto al frente, a la derecha el abanico. Avanza solo mientras está a
 * la vista, con botón para pausar; las flechas, las fresas y las tarjetas
 * vecinas también cambian el producto.
 */
function Vitrina({
	productos,
	categorias,
	respaldo,
	children,
}: {
	productos: Producto[];
	categorias: Contenido["categorias"];
	respaldo: boolean;
	children: ReactNode;
}) {
	const cantidad = productos.length;
	const [elegido, setElegido] = useState(0);
	const [pausado, setPausado] = useState(false);
	const zona = useRef<HTMLDivElement>(null);
	const panel = useRef<HTMLDivElement>(null);
	const ir = useCallback(
		(paso: number) => setElegido((i) => (i + paso + cantidad) % cantidad),
		[cantidad],
	);
	const avanzar = useCallback(() => ir(1), [ir]);
	useAutoavance(zona, avanzar, pausado || cantidad < 2);
	const actual = productos[elegido] ?? productos[0];
	useCambioAnimado(panel, actual.id);

	return (
		<div className="envoltura vitrina" ref={zona}>
			<div className="vitrina-texto">
				{children}
				<div className="vitrina-divisor" aria-hidden="true" />
				<div className="vitrina-actual" ref={panel} aria-live="polite">
					<div className="vitrina-actual-textos" data-cambio="texto">
						{cantidad > 1 && (
							<p className="vitrina-contador">
								{String(elegido + 1).padStart(2, "0")} /{" "}
								{String(cantidad).padStart(2, "0")}
							</p>
						)}
						<p className="vitrina-nombre">{actual.nombre}</p>
						<p>{actual.descripcion}</p>
						<p className="vitrina-precio">{precioDesde(actual, respaldo)}</p>
					</div>
				</div>
				<Link className="boton" to={`/producto/${actual.id}`}>
					Elegir y ponerle mi toque
					<Icono nombre="mas" />
				</Link>
				{cantidad > 1 && (
					<div className="vitrina-controles">
						<button
							type="button"
							className="redondo"
							onClick={() => ir(-1)}
							aria-label="Producto anterior"
						>
							<Icono nombre="izquierda" />
						</button>
						<div className="vitrina-fresas">
							{productos.map((producto, indice) => (
								<button
									key={producto.id}
									type="button"
									className="vitrina-fresa"
									aria-label={`Ver ${producto.nombre}`}
									aria-current={indice === elegido}
									onClick={() => setElegido(indice)}
								>
									<FresaPosicion activa={indice === elegido} />
								</button>
							))}
						</div>
						<button
							type="button"
							className="redondo"
							onClick={() => ir(1)}
							aria-label="Producto siguiente"
						>
							<Icono nombre="derecha" />
						</button>
						<button
							type="button"
							className="vitrina-pausa"
							onClick={() => setPausado((p) => !p)}
							aria-label={
								pausado
									? "Reanudar el avance automático"
									: "Pausar el avance automático"
							}
							aria-pressed={pausado}
						>
							{pausado ? <IconoReanudar /> : <IconoPausa />}
						</button>
					</div>
				)}
			</div>
			<Abanico
				productos={productos}
				elegido={elegido}
				alElegir={setElegido}
				categorias={categorias}
				respaldo={respaldo}
			/>
		</div>
	);
}

/** Dos barras de pausa; el conjunto de iconos del sitio no trae una. */
function IconoPausa() {
	return (
		<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
			<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
			<rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
		</svg>
	);
}

/** Triángulo de reanudar. */
function IconoReanudar() {
	return (
		<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
			<path d="M7 5l12 7-12 7z" fill="currentColor" />
		</svg>
	);
}

/** Tarjeta de producto: lleva a la ficha. El precio aparece solo si está publicado. */
export function TarjetaProducto({
	producto,
	categorias = [],
	enBeige = false,
	respaldo = false,
}: {
	producto: Producto;
	categorias?: Contenido["categorias"];
	enBeige?: boolean;
	respaldo?: boolean;
}) {
	const precio = precioDesde(producto, respaldo);
	return (
		<Link
			className="tarjeta"
			to={`/producto/${producto.id}`}
			aria-label={`${nombreProducto(producto, categorias)}, ${precio}, ver ficha`}
		>
			<div className="tarjeta-foto">
				<FotoProducto producto={producto} enBeige={enBeige} />
				{producto.categoria !== "chocolate" && (
					<div className="cara b" aria-hidden="true">
						<FotoProducto producto={producto} enBeige={enBeige} segunda />
					</div>
				)}
			</div>
			<div className="tarjeta-info">
				<span className="tarjeta-nombre">{producto.nombre}</span>
				<span className="tarjeta-pie">
					<span className="tarjeta-precio">{precio}</span>
					<span className="tarjeta-elegir" aria-hidden="true">
						Elegir <Icono nombre="derecha" />
					</span>
				</span>
			</div>
		</Link>
	);
}
