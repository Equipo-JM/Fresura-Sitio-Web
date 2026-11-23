import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import type { Database } from "../../tipos/database.types";
import { Campo, ErrorCampo, useEdicion } from "./Campos";
import { subirFoto } from "./subirFoto";

/** Cambia solo la foto del borrador; bloquea el guardado mientras se prepara y sube. */
export function FotoProducto({
	ruta,
	cliente,
}: {
	ruta: string;
	cliente: SupabaseClient<Database>;
}) {
	const { contenido, cambiar, fotosPendientes, errores } = useEdicion();
	const indice = Number(ruta.split(".")[1]);
	const imagen = contenido.productos[indice].imagen;
	const [estado, setEstado] = useState("");
	const [error, setError] = useState("");
	async function elegir(archivo?: File) {
		if (!archivo) return;
		fotosPendientes(1);
		setEstado("Preparando y subiendo la foto…");
		setError("");
		try {
			const foto = await subirFoto(cliente, archivo, imagen.alt);
			cambiar(`${ruta}.imagen`, foto);
			setEstado("Foto lista. Guarda los cambios para conservarla.");
		} catch (fallo) {
			setEstado("");
			setError(
				fallo instanceof Error
					? fallo.message
					: "No pudimos subir la foto. Inténtalo de nuevo.",
			);
		} finally {
			fotosPendientes(-1);
		}
	}
	return (
		<fieldset className="panel-bloque">
			<legend>Foto</legend>
			{imagen.ruta && (
				<img
					className="panel-editor-foto"
					src={imagen.ruta}
					alt={imagen.alt}
					width={imagen.ancho}
					height={imagen.alto}
				/>
			)}
			<label className="campo">
				Cambiar foto
				<input
					name={`${ruta}.imagen`}
					data-campo={`${ruta}.imagen.ruta`}
					aria-invalid={!!errores[`${ruta}.imagen.ruta`]}
					aria-describedby={
						errores[`${ruta}.imagen.ruta`]
							? `error-${ruta}.imagen.ruta`
							: undefined
					}
					type="file"
					accept="image/jpeg,image/png,image/webp"
					onChange={(e) => {
						void elegir(e.target.files?.[0]);
						e.target.value = "";
					}}
				/>
			</label>
			<ErrorCampo ruta={`${ruta}.imagen.ruta`} />
			<Campo
				ruta={`${ruta}.imagen.alt`}
				etiqueta="Describe la foto"
				maximo={160}
			/>
			<p role="status">{estado}</p>
			{error && (
				<p role="alert" className="panel-aviso">
					{error}
				</p>
			)}
		</fieldset>
	);
}
