import type { SupabaseClient } from "@supabase/supabase-js";
import { esquemaContenido } from "../../../backend/supabase/functions/_shared/esquemas/contenido";
import type { Database } from "../tipos/database.types";
import { useVersiones } from "./versiones/useVersiones";

/** Resume la publicación y el catálogo disponibles para la sesión administrativa. */
export function EscritorioPanel({
	cliente,
	abrir,
}: {
	cliente: SupabaseClient<Database>;
	abrir: (seccion: "contenido" | "versiones") => void;
}) {
	const { versiones, error, recargar, ocupado } = useVersiones(cliente);
	const catalogo = esquemaContenido.safeParse(
		(versiones?.borrador ?? versiones?.publicada)?.json,
	);
	return (
		<main id="escritorio" tabIndex={-1}>
			<div className="mesa-portada">
				<div>
					<p>Mesa de trabajo</p>
					<h1>El escritorio de Fresura</h1>
					<button
						className="boton"
						type="button"
						onClick={() => abrir("versiones")}
					>
						Revisar versiones
					</button>
				</div>
			</div>
			{error && (
				<p role="alert">
					{error}{" "}
					<button
						type="button"
						disabled={ocupado}
						onClick={() => void recargar()}
					>
						Reintentar
					</button>
				</p>
			)}
			{!versiones && !error && <p role="status">Cargando el escritorio…</p>}
			{versiones && (
				<div className="mesa-resumen">
					<section>
						<h2>Productos del menú</h2>
						{catalogo.success ? (
							<ul>
								{catalogo.data.productos.slice(0, 4).map((p) => (
									<li key={p.id}>
										<strong>{p.nombre}</strong>
										<span>
											{
												catalogo.data.categorias.find(
													(c) => c.id === p.categoria,
												)?.nombre
											}
										</span>
									</li>
								))}
							</ul>
						) : (
							<p>Catálogo no disponible.</p>
						)}
						<button
							className="boton secundario"
							type="button"
							onClick={() => abrir("contenido")}
						>
							Abrir catálogo
						</button>
					</section>
					<section>
						<h2>Publicación</h2>
						<p>
							{versiones.publicada?.publicada_en
								? "En el sitio desde el " +
									new Intl.DateTimeFormat("es-CO", {
										dateStyle: "long",
										timeZone: "America/Bogota",
									}).format(new Date(versiones.publicada.publicada_en))
								: "Sin fecha de publicación"}
						</p>
						<h3>
							{versiones.borrador
								? "Cambios guardados"
								: "Sin cambios pendientes"}
						</h3>
						<button
							type="button"
							className="boton secundario"
							onClick={() => abrir("versiones")}
						>
							Ver versiones
						</button>
					</section>
				</div>
			)}
		</main>
	);
}
