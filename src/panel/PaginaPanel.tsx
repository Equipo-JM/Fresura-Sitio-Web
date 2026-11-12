import { type ReactNode, useState } from "react";
import { Link, useSearchParams } from "react-router";
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
import {
	obtenerClientePanel,
	panelConfigurado,
} from "../compartido/supabase/clientePanel";
import { FOTO_PORTADA } from "../sitio/inicio/copy";
import { AccesoDemo } from "./AccesoDemo";
import { MarcoAcceso } from "./acceso/MarcoAcceso";
import { PantallaCodigo, Salir } from "./acceso/PantallaCodigo";
import { PantallaEntrar } from "./acceso/PantallaEntrar";
import { useSesionPanel } from "./acceso/useSesionPanel";
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
 * `/admin`. Con Supabase configurado, el acceso es real: contraseña con
 * Turnstile y código de la app autenticadora (etapa 3). Sin configuración, o
 * con `?demo`, queda el modo demostración con acceso simulado.
 */
export function PaginaPanel() {
	const [busqueda] = useSearchParams();
	if (panelConfigurado() && !busqueda.has("demo")) return <PanelReal />;
	return <PanelDemo />;
}

function PanelReal() {
	const cliente = obtenerClientePanel();
	const { estado, refrescar } = useSesionPanel(cliente);

	switch (estado) {
		case "cargando":
			return (
				<MarcoAcceso titulo="Panel de Fresura">
					<p>Cargando…</p>
				</MarcoAcceso>
			);
		case "sin-sesion":
			return <PantallaEntrar cliente={cliente} />;
		case "registrar-codigo":
		case "pedir-codigo":
			return (
				<PantallaCodigo
					cliente={cliente}
					registrar={estado === "registrar-codigo"}
					onListo={() => void refrescar()}
				/>
			);
		case "sin-permiso":
			return (
				<MarcoAcceso titulo="Esta cuenta no tiene acceso">
					<p>
						Entraste bien, pero esta cuenta no es de administración. Si crees
						que es un error, avisa al equipo.
					</p>
					<Salir cliente={cliente} />
				</MarcoAcceso>
			);
		case "dentro":
			return (
				<ContenidoPanel
					etiqueta="Sesión verificada"
					aviso={
						<>
							<strong>Entraste con tu cuenta y tu código.</strong> Por ahora las
							fotos que cambies se guardan solo en este navegador; subirlas a la
							nube y publicarlas con vista previa es el siguiente paso.
						</>
					}
					onSalir={() => void cliente.auth.signOut()}
				/>
			);
	}
}

function PanelDemo() {
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
		<ContenidoPanel
			etiqueta="Modo demostración"
			aviso={
				<>
					<strong>Estás en una demostración.</strong> Las fotos que cambies se
					guardan solo en este navegador y se ven al instante en el sitio. En la
					versión final se suben a la nube, con vista previa antes de publicar y
					opción de volver a la versión anterior.
				</>
			}
			onSalir={() => {
				guardarSesion(false);
				setSesion(false);
			}}
		/>
	);
}

/** Encabezado y sección de fotos, iguales en el panel real y en la demostración. */
function ContenidoPanel({
	etiqueta,
	aviso,
	onSalir,
}: {
	etiqueta: string;
	aviso: ReactNode;
	onSalir: () => void;
}) {
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
					<span className="panel-demo-etiqueta">{etiqueta}</span>
					<nav className="panel-h-acciones" aria-label="Panel">
						<Link className="boton secundario compacto" to="/" target="_blank">
							Ver el sitio
							<span className="oculto"> (se abre en otra pestaña)</span>
						</Link>
						<button type="button" className="boton-texto" onClick={onSalir}>
							Salir
						</button>
					</nav>
				</div>
			</header>
			<main className="envoltura panel-cuerpo" id="contenido">
				<h1>Fotos</h1>
				<div className="panel-aviso" role="note">
					<Icono nombre="alerta" />
					<p>{aviso}</p>
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
