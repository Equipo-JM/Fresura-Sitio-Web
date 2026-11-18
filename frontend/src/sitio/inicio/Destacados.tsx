import { useRef, useState } from "react";
import { Link } from "react-router";
import type { Contenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";
import { Icono } from "../../compartido/componentes/Icono";
import { useCambioAnimado } from "../../compartido/movimiento/useCambioAnimado";
import { Calcomania } from "../Calcomania";
import { Abanico, onzasDe, precioDesde } from "./Abanico";
import { DATOS_CATEGORIAS } from "./copy";

type Producto = Contenido["productos"][number];

/**
 * Lo que incluye una categoría, a partir de su dato del menú provisional:
 * «9 oz · Incluye 1 base, 1 espolvoreado…» → [{1, base}, {1, espolvoreado}…].
 * Lo que no trae cantidad («helado») se marca con «+».
 */
function inclusiones(
	categoria: string,
): { cantidad: string; nombre: string }[] {
	const dato = DATOS_CATEGORIAS[categoria] ?? "";
	const lista = dato.split("Incluye ")[1];
	if (!lista) return [];
	return lista.split(/, | y /).map((trozo) => {
		const partes = trozo.match(/^(\d+)\s+(.+)$/);
		return partes
			? { cantidad: partes[1], nombre: partes[2] }
			: { cantidad: "+", nombre: trozo };
	});
}

/** Nombre corto para el selector: «Arma tu Fresota» → «Fresota». */
function nombreCorto(producto: Producto): string {
	return producto.nombre.replace(/^Arma tu /, "");
}

/**
 * Productos que el administrador marca como destacados (RF-07), en el orden de
 * su categoría y del producto, en abanico. A la izquierda la persona elige
 * según su antojo; si todos los favoritos son de un solo tamaño en onzas, el
 * selector pregunta por el tamaño. Si no hay ninguno vigente, la franja no se
 * muestra: nunca queda un bloque vacío.
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
	const [elegido, setElegido] = useState(0);
	const panel = useRef<HTMLDivElement>(null);
	const actual = destacados[elegido] ?? destacados[0] ?? null;
	useCambioAnimado(panel, actual?.id ?? "");
	if (!actual) return null;
	const porTamano = destacados.every((p) => onzasDe(p) !== null);
	const incluye = inclusiones(actual.categoria);

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
			<div className="envoltura vitrina">
				<div className="vitrina-texto">
					<div className="destacados-encabezado">
						<h2 id="titulo-destacados">
							Nuestros <em>favoritos</em>
						</h2>
						<p>Elegidos por Fresura para que empieces por aquí.</p>
					</div>
					<fieldset className="antojo-selector">
						<legend>
							{porTamano
								? "¿De qué tamaño es tu antojo?"
								: "¿Qué se te antoja hoy?"}
						</legend>
						<div className="antojo-opciones">
							{destacados.map((producto, indice) => {
								const onzas = onzasDe(producto);
								return (
									<button
										key={producto.id}
										type="button"
										className="antojo-opcion"
										aria-pressed={indice === elegido}
										aria-label={producto.nombre}
										onClick={() => setElegido(indice)}
									>
										{onzas && (
											<VasoTamano
												onzas={Number(onzas)}
												activo={indice === elegido}
											/>
										)}
										<span className="antojo-nombre">
											{nombreCorto(producto)}
										</span>
										{onzas && (
											<span className="antojo-detalle">{onzas} oz</span>
										)}
									</button>
								);
							})}
						</div>
					</fieldset>
					<div className="vitrina-divisor" aria-hidden="true" />
					<div className="vitrina-actual" ref={panel} aria-live="polite">
						<div className="vitrina-actual-textos" data-cambio="texto">
							<p className="vitrina-nombre">{actual.nombre}</p>
							<p>{actual.descripcion}</p>
							{incluye.length > 0 && (
								<ul className="vitrina-incluye" aria-label="Incluye">
									{incluye.map((item) => (
										<li key={item.nombre}>
											<strong>{item.cantidad}</strong> {item.nombre}
										</li>
									))}
								</ul>
							)}
							<p className="vitrina-precio">{precioDesde(actual, respaldo)}</p>
						</div>
					</div>
					<Link className="boton" to={`/producto/${actual.id}`}>
						Ver {actual.nombre}
						<Icono nombre="derecha" />
					</Link>
				</div>
				<Abanico
					productos={destacados}
					elegido={elegido}
					alElegir={setElegido}
					categorias={contenido.categorias}
					respaldo={respaldo}
				/>
			</div>
		</section>
	);
}

/** Vaso del selector: más alto cuantas más onzas trae. Es decorativo. */
function VasoTamano({ onzas, activo }: { onzas: number; activo: boolean }) {
	const alto = Math.round(14 + onzas * 1.4);
	return (
		<svg
			className="antojo-vaso"
			width="22"
			height={alto}
			viewBox="0 0 40 56"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<path
				d="M6 16h28l-4 38H10z"
				fill="none"
				stroke="currentColor"
				strokeWidth="2.5"
				strokeLinejoin="round"
			/>
			<path
				d="M4 16c0-8 7-12 16-12s16 4 16 12"
				fill={activo ? "var(--color-flamingo)" : "var(--color-we-peep)"}
				stroke="currentColor"
				strokeWidth="2.5"
			/>
		</svg>
	);
}
