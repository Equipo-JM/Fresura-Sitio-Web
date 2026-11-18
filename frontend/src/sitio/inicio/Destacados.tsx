import { useRef, useState } from "react";
import { Link } from "react-router";
import type { Contenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";
import { pesos } from "../../compartido/carrito/reglas";
import { Icono } from "../../compartido/componentes/Icono";
import { useCambioAnimado } from "../../compartido/movimiento/useCambioAnimado";
import { Calcomania } from "../Calcomania";
import { FotoProducto } from "../FotoProducto";

type Producto = Contenido["productos"][number];

/** «Desde $…» del producto, o el aviso que corresponda si no tiene precio. */
function precioDesde(producto: Producto, respaldo: boolean): string {
	const precios = producto.presentaciones
		.map((p) => p.precio)
		.filter((p): p is number => p !== null);
	if (precios.length > 0) return `Desde ${pesos(Math.min(...precios))}`;
	return respaldo ? "Consulta precios por WhatsApp" : "Precio por confirmar";
}

/**
 * Productos que el administrador marca como destacados (RF-07), en el orden
 * de su categoría y del producto. A la izquierda se elige uno y a la derecha se
 * muestra su tarjeta, que cambia con una transición y lleva a la ficha. Si no
 * hay ninguno vigente, la franja no se muestra: nunca queda un bloque vacío.
 */
export function Destacados({
	contenido,
	respaldo = false,
}: {
	contenido: Contenido;
	respaldo?: boolean;
}) {
	const ordenCategoria = new Map(
		contenido.categorias.map((c) => [c.id, c.orden]),
	);
	const destacados = contenido.productos
		.filter((p) => p.destacado && p.vigente)
		.sort(
			(a, b) =>
				(ordenCategoria.get(a.categoria) ?? 0) -
					(ordenCategoria.get(b.categoria) ?? 0) || a.orden - b.orden,
		);
	const [idElegido, setIdElegido] = useState<string | null>(null);
	const tarjeta = useRef<HTMLDivElement>(null);
	const elegido =
		destacados.find((p) => p.id === idElegido) ?? destacados[0] ?? null;
	useCambioAnimado(tarjeta, elegido?.id ?? "");
	if (!elegido) return null;
	const categoria = contenido.categorias.find(
		(c) => c.id === elegido.categoria,
	);

	return (
		<section
			className="seccion destacados fondo-dust"
			id="destacados"
			aria-labelledby="titulo-destacados"
		>
			<Calcomania
				nombre="ven-date-un-gusto-bonito"
				className="calcomania-corte corte-destacados"
			/>
			<div className="envoltura favoritos">
				<div className="favoritos-texto">
					<div className="destacados-encabezado">
						<h2 id="titulo-destacados">
							Nuestros <em>favoritos</em>
						</h2>
						<p>Elegidos por Fresura para que empieces por aquí.</p>
					</div>
					<ul className="favoritos-lista" aria-label="Elige un favorito">
						{destacados.map((producto) => (
							<li key={producto.id}>
								<button
									type="button"
									className="chip-favorito"
									aria-pressed={producto.id === elegido.id}
									onClick={() => setIdElegido(producto.id)}
								>
									{producto.nombre}
								</button>
							</li>
						))}
					</ul>
					<p className="favoritos-nota">
						Toca un favorito y te mostramos de qué se trata.
					</p>
				</div>
				<div className="favorito-tarjeta" ref={tarjeta} aria-live="polite">
					<div className="tarjeta-foto favorito-foto" data-cambio="foto">
						<FotoProducto producto={elegido} enBeige />
					</div>
					<div className="favorito-cuerpo" data-cambio="texto">
						<p className="favorito-nombre">{elegido.nombre}</p>
						<p className="favorito-precio">
							{precioDesde(elegido, respaldo)}
							{categoria ? ` · ${categoria.nombre}` : ""}
						</p>
						<p>{elegido.descripcion}</p>
						<Link className="boton" to={`/producto/${elegido.id}`}>
							Ver {elegido.nombre}
							<Icono nombre="derecha" />
						</Link>
					</div>
				</div>
			</div>
		</section>
	);
}
