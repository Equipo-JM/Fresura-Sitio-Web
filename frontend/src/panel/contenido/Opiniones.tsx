import { Campo, Casilla } from "./Campos";

/** Datos de la ficha pública: al mostrarlos, el contrato exige completar los cuatro. */
export function Opiniones() {
	return (
		<section aria-labelledby="titulo-opiniones">
			<h2 id="titulo-opiniones">Opiniones</h2>
			<Casilla ruta="opiniones.mostrar" etiqueta="Mostrar opiniones" />
			<Campo
				ruta="opiniones.calificacion"
				etiqueta="Calificación (de 1 a 5)"
				tipo="number"
				opcional
			/>
			<Campo
				ruta="opiniones.numero_opiniones"
				etiqueta="Número de opiniones"
				tipo="number"
				opcional
			/>
			<Campo
				ruta="opiniones.fecha_corte"
				etiqueta="Fecha de corte"
				tipo="date"
				opcional
			/>
			<Campo
				ruta="opiniones.url_ficha"
				etiqueta="Enlace a la ficha"
				tipo="url"
				opcional
			/>
		</section>
	);
}
