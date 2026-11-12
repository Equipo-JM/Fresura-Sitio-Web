import { useState } from "react";
import { Link } from "react-router";
import type { Contenido } from "../../supabase/functions/_shared/esquemas/contenido";
import { Icono } from "../compartido/componentes/Icono";
import { tieneFoto } from "../compartido/contenido/fotos";
import { useContenido } from "../compartido/contenido/useContenido";
import {
	borrarFotosDemo,
	CLAVE_PORTADA,
	claveProducto,
} from "../compartido/fotos/almacenFotosDemo";
import { useFotosDemo } from "../compartido/fotos/useFotosDemo";
import { FOTO_PORTADA } from "../sitio/inicio/copy";
import { AccesoDemo } from "./AccesoDemo";
import { CambiarFoto } from "./CambiarFoto";

/** Clave de la sesión simulada: dura lo que la pestaña. */
const CLAVE_SESION = "fresura-panel-demo-sesion";

function leerSesion(): boolean {
	try {
		return sessionStorage.getItem(CLAVE_SESION) === "1";
	} catch {
		return false;
	}
}

function guardarSesion(abierta: boolean) {
	try {
		if (abierta) sessionStorage.setItem(CLAVE_SESION, "1");
		else sessionStorage.removeItem(CLAVE_SESION);
	} catch {
		// Sin almacenamiento, la sesión simulada dura hasta recargar.
	}
}

/**
 * `/admin` en modo demostración: acceso simulado y cambio de fotos guardado en
 * este navegador. Enseña el flujo mientras se construye el panel real (etapa 3).
 */
export function PaginaPanel() {
	const [sesion, setSesion] = useState(leerSesion);

	if (!sesion) {
		return (
			<AccesoDemo
				onEntrar={() => {
					guardarSesion(true);
					setSesion(true);
				}}
			/>
		);
	}

	return (
		<div className="panel">
			<header className="panel-h">
				<div className="envoltura panel-h-fila">
					<img
						src="/marca/logo-horizontal-color.svg"
						alt="Fresura"
						width="150"
						height="27"
					/>
					<span className="panel-demo-etiqueta">Modo demostración</span>
					<nav className="panel-h-acciones" aria-label="Panel">
						<Link className="boton secundario compacto" to="/" target="_blank">
							Ver el sitio
							<span className="oculto"> (se abre en otra pestaña)</span>
						</Link>
						<button
							type="button"
							className="boton-texto"
							onClick={() => {
								guardarSesion(false);
								setSesion(false);
							}}
						>
							Salir
						</button>
					</nav>
				</div>
			</header>
			<main className="envoltura panel-cuerpo" id="contenido">
				<h1>Fotos</h1>
				<div className="panel-aviso" role="note">
					<Icono nombre="alerta" />
					<p>
						<strong>Estás en una demostración.</strong> Las fotos que cambies se
						guardan solo en este navegador y se ven al instante en el sitio. En
						la versión final se suben a la nube, con vista previa antes de
						publicar y opción de volver a la versión anterior.
					</p>
				</div>
				<ContenidoFotos />
			</main>
		</div>
	);
}

function ContenidoFotos() {
	const { data, isPending, isError } = useContenido();
	if (isPending) return <p>Cargando…</p>;
	if (isError) return <p>No pudimos cargar el menú.</p>;
	return <ListaFotos contenido={data.contenido} />;
}

function ListaFotos({ contenido }: { contenido: Contenido }) {
	const fotos = useFotosDemo();
	const categorias = [...contenido.categorias].sort(
		(a, b) => a.orden - b.orden,
	);
	const hayCambios = Object.keys(fotos).length > 0;

	return (
		<>
			<section className="panel-seccion" aria-labelledby="t-portada">
				<h2 id="t-portada">Foto de portada</h2>
				<p className="chico">
					Es la primera foto que ve quien entra. Queda mejor una vertical.
				</p>
				<div className="panel-fotos panel-fotos-uno">
					<CambiarFoto
						clave={CLAVE_PORTADA}
						titulo="Portada"
						cambiada={fotos[CLAVE_PORTADA]}
						original={{ url: FOTO_PORTADA.src, alt: FOTO_PORTADA.alt }}
						descripcionInicial={FOTO_PORTADA.alt}
					/>
				</div>
			</section>

			{categorias.map((categoria) => {
				const productos = contenido.productos
					.filter((p) => p.categoria === categoria.id)
					.sort((a, b) => a.orden - b.orden);
				if (productos.length === 0) return null;
				return (
					<section
						className="panel-seccion"
						key={categoria.id}
						aria-labelledby={`t-${categoria.id}`}
					>
						<h2 id={`t-${categoria.id}`}>{categoria.nombre}</h2>
						<div className="panel-fotos">
							{productos.map((producto) => (
								<CambiarFoto
									key={producto.id}
									clave={claveProducto(producto.id)}
									titulo={producto.nombre}
									cambiada={fotos[claveProducto(producto.id)]}
									original={
										tieneFoto(producto.imagen)
											? { url: producto.imagen.ruta, alt: producto.imagen.alt }
											: null
									}
									descripcionInicial={producto.nombre}
								/>
							))}
						</div>
					</section>
				);
			})}

			{hayCambios && (
				<p>
					<button
						type="button"
						className="boton secundario"
						onClick={() => void borrarFotosDemo()}
					>
						Borrar todas las fotos de la demostración
					</button>
				</p>
			)}
		</>
	);
}
