import { useId, useState } from "react";
import { FotoPendiente } from "../compartido/componentes/FotoPendiente";
import { Icono } from "../compartido/componentes/Icono";
import {
	describirFotoDemo,
	type FotoDemo,
	guardarFotoDemo,
	quitarFotoDemo,
} from "../compartido/fotos/almacenFotosDemo";
import { prepararFoto } from "../compartido/fotos/prepararFoto";

/**
 * Tarjeta para cambiar una foto: muestra la actual, permite elegir otra,
 * describirla (texto alternativo, RNF-08) y volver a la anterior.
 */
export function CambiarFoto({
	clave,
	titulo,
	cambiada,
	original,
	descripcionInicial,
}: {
	clave: string;
	titulo: string;
	/** La foto que se subió en el panel, si hay. */
	cambiada: FotoDemo | undefined;
	/** Lo que se ve si no se ha cambiado: una foto de ejemplo o ninguna. */
	original: { url: string; alt: string } | null;
	descripcionInicial: string;
}) {
	const id = useId();
	const [estado, setEstado] = useState<
		{ tipo: "listo" | "error"; texto: string } | { tipo: "trabajando" } | null
	>(null);
	const [descripcion, setDescripcion] = useState(
		cambiada?.alt ?? descripcionInicial,
	);
	const visible = cambiada ?? original;

	async function elegir(archivo: File | undefined) {
		if (!archivo) return;
		setEstado({ tipo: "trabajando" });
		try {
			const foto = await prepararFoto(archivo);
			await guardarFotoDemo(clave, foto, descripcion.trim() || titulo);
			setEstado({
				tipo: "listo",
				texto: `Foto lista (${Math.round(foto.size / 1024)} KB). Ya se ve en el sitio.`,
			});
		} catch (error) {
			setEstado({
				tipo: "error",
				texto:
					error instanceof Error
						? error.message
						: "No pudimos guardar la foto.",
			});
		}
	}

	async function quitar() {
		await quitarFotoDemo(clave);
		setDescripcion(descripcionInicial);
		setEstado({ tipo: "listo", texto: "Volvió la foto anterior." });
	}

	return (
		<article className="panel-foto" aria-labelledby={`${id}-titulo`}>
			<div className="panel-foto-vista">
				{visible ? (
					<img src={visible.url} alt={visible.alt} />
				) : (
					<FotoPendiente texto="Sin foto" />
				)}
				{cambiada && <span className="panel-foto-nueva">Foto nueva</span>}
			</div>
			<div className="panel-foto-datos">
				<h3 id={`${id}-titulo`}>{titulo}</h3>
				<label className="boton secundario compacto panel-subir">
					<input
						type="file"
						className="oculto"
						accept="image/jpeg,image/png,image/webp"
						disabled={estado?.tipo === "trabajando"}
						onChange={(e) => {
							void elegir(e.target.files?.[0]);
							// Permite volver a elegir el mismo archivo.
							e.target.value = "";
						}}
					/>
					<Icono nombre="foto" />
					{estado?.tipo === "trabajando"
						? "Preparando…"
						: visible
							? "Cambiar foto"
							: "Subir foto"}
				</label>
				<div className="campo">
					<label htmlFor={`${id}-alt`}>Describe la foto</label>
					<input
						id={`${id}-alt`}
						value={descripcion}
						maxLength={120}
						onChange={(e) => setDescripcion(e.target.value)}
						onBlur={() => {
							if (cambiada)
								void describirFotoDemo(clave, descripcion.trim() || titulo);
						}}
						aria-describedby={`${id}-alt-ayuda`}
					/>
					<p className="cf-ayuda" id={`${id}-alt-ayuda`}>
						Lo leen quienes usan lector de pantalla.
					</p>
				</div>
				{cambiada && (
					<button
						type="button"
						className="boton-texto"
						onClick={() => void quitar()}
					>
						Volver a la foto anterior
					</button>
				)}
				<p
					className={`panel-foto-estado${estado?.tipo === "error" ? " error" : ""}`}
					role="status"
				>
					{estado && estado.tipo !== "trabajando" && (
						<>
							<Icono nombre={estado.tipo === "error" ? "alerta" : "ok"} />
							<span>{estado.texto}</span>
						</>
					)}
				</p>
			</div>
		</article>
	);
}
