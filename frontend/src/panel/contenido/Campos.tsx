import { createContext, type ReactNode, useContext, useId } from "react";
import type { Contenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";

/** Estado compartido por los bloques; conserva los valores inválidos hasta corregirlos. */
export type Edicion = {
	contenido: Contenido;
	errores: Record<string, string>;
	cambiar: (ruta: string, valor: unknown) => void;
	fotosPendientes: (cambio: number) => void;
};
/** Contexto limitado al formulario del borrador. */
export const ContextoEdicion = createContext<Edicion | null>(null);
/** Obtiene la edición activa sin sincronizar con sistemas externos. */
export function useEdicion() {
	const valor = useContext(ContextoEdicion);
	if (!valor) throw new Error("Falta el formulario");
	return valor;
}

/** Cambia un único campo conservando el resto del contrato y sus referencias. */
export function cambiarCampo<T>(objeto: T, ruta: string, valor: unknown): T {
	if (!ruta) return valor as T;
	const partes = ruta.split(".");
	function reemplazar(actual: unknown, indice: number): unknown {
		if (indice === partes.length) return valor;
		const clave = partes[indice];
		if (Array.isArray(actual))
			return actual.map((elemento, i) =>
				i === Number(clave) ? reemplazar(elemento, indice + 1) : elemento,
			);
		const registro = actual as Record<string, unknown>;
		return { ...registro, [clave]: reemplazar(registro[clave], indice + 1) };
	}
	return reemplazar(objeto, 0) as T;
}
function leer(objeto: unknown, ruta: string): unknown {
	return ruta
		.split(".")
		.reduce<unknown>(
			(valor, clave) => (valor as Record<string, unknown>)[clave],
			objeto,
		);
}

/** Mensaje accesible para campos o listas rechazados por el contrato. */
export function ErrorCampo({ ruta }: { ruta: string }) {
	const { errores } = useEdicion();
	return errores[ruta] ? (
		<p tabIndex={-1} id={`error-${ruta}`} className="panel-aviso">
			{errores[ruta]}
		</p>
	) : null;
}
/** Campo con etiqueta y rechazo asociado; los números vacíos no se convierten en cero. */
export function Campo({
	ruta,
	etiqueta,
	tipo = "text",
	maximo,
	opcional = false,
}: {
	ruta: string;
	etiqueta: string;
	tipo?: "text" | "textarea" | "number" | "date" | "url" | "tel";
	maximo?: number;
	opcional?: boolean;
}) {
	const { contenido, errores, cambiar } = useEdicion();
	const id = useId();
	const valor = leer(contenido, ruta);
	const atributos = {
		id,
		name: ruta,
		autoComplete: "off",
		"data-campo": ruta,
		value:
			typeof valor === "number" && Number.isNaN(valor)
				? ""
				: String(valor ?? ""),
		"aria-invalid": !!errores[ruta],
		"aria-describedby": errores[ruta] ? `error-${ruta}` : undefined,
		onChange: (evento: { target: { value: string } }) => {
			const texto = evento.target.value;
			cambiar(
				ruta,
				opcional && texto === ""
					? null
					: tipo === "number"
						? texto === ""
							? Number.NaN
							: Number(texto)
						: texto,
			);
		},
	};
	return (
		<div className="campo">
			<label htmlFor={id}>{etiqueta}</label>
			{tipo === "textarea" ? (
				<textarea {...atributos} maxLength={maximo} />
			) : (
				<input
					{...atributos}
					type={tipo}
					step={tipo === "number" ? "any" : undefined}
					maxLength={maximo}
				/>
			)}
			<ErrorCampo ruta={ruta} />
		</div>
	);
}
/** Casilla con nombre visible, también utilizable con teclado. */
export function Casilla({
	ruta,
	etiqueta,
}: {
	ruta: string;
	etiqueta: string;
}) {
	const { contenido, cambiar } = useEdicion();
	return (
		<label className="panel-aprobacion">
			<input
				type="checkbox"
				checked={Boolean(leer(contenido, ruta))}
				onChange={(e) => cambiar(ruta, e.target.checked)}
			/>
			{etiqueta}
		</label>
	);
}
/** Selector cuyos valores internos no se presentan al administrador. */
export function Selector({
	ruta,
	etiqueta,
	opciones,
}: {
	ruta: string;
	etiqueta: string;
	opciones: { valor: string; nombre: string }[];
}) {
	const { contenido, cambiar, errores } = useEdicion();
	const id = useId();
	return (
		<div className="campo">
			<label htmlFor={id}>{etiqueta}</label>
			<select
				name={ruta}
				autoComplete="off"
				data-campo={ruta}
				id={id}
				value={String(leer(contenido, ruta))}
				aria-invalid={!!errores[ruta]}
				aria-describedby={errores[ruta] ? `error-${ruta}` : undefined}
				onChange={(e) => cambiar(ruta, e.target.value)}
			>
				<option value="">Elige una opción</option>
				{opciones.map((o) => (
					<option key={o.valor} value={o.valor}>
						{o.nombre}
					</option>
				))}
			</select>
			<ErrorCampo ruta={ruta} />
		</div>
	);
}
/** Agrupa listas anidadas con sus errores de cantidad. */
export function ListaCampos({
	ruta,
	titulo,
	children,
	agregar,
}: {
	ruta: string;
	titulo: string;
	children: ReactNode;
	agregar?: () => void;
}) {
	return (
		<fieldset className="panel-bloque">
			<legend>{titulo}</legend>
			<ErrorCampo ruta={ruta} />
			{children}
			{agregar && (
				<button
					type="button"
					className="boton secundario compacto"
					onClick={agregar}
				>
					Agregar {titulo.toLowerCase()}
				</button>
			)}
		</fieldset>
	);
}
