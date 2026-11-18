import { Icono } from "../compartido/componentes/Icono";
import { Calcomania } from "./Calcomania";
import { ConContenido } from "./ConContenido";
import { Sedes } from "./inicio/Secciones";

/** Direcciones y contacto con enlaces de mapas; no carga mapas externos (DD-11). */
export function PaginaSedes() {
	return (
		<ConContenido>
			{(contenido) => (
				<section className="pagina pagina-sedes">
					<div className="envoltura titulo-con-calcomania calcomania-sedes">
						<h1>
							Sedes y <em>contacto</em>
						</h1>
						<p>Mismos productos y precios en ambas.</p>
						<Calcomania nombre="las-mejores-fresas-de-bogota" />
					</div>
					<Sedes contenido={contenido} pagina />
					<div className="envoltura">
						<section
							className="promo-mini contacto-sedes"
							aria-labelledby="titulo-contacto"
						>
							<h2 id="titulo-contacto">Contacto</h2>
							<p>Escríbenos y te atendemos con gusto.</p>
							<a
								className="boton"
								href={`https://wa.me/${contenido.negocio.whatsapp}`}
							>
								<Icono nombre="chat" />
								Escríbenos por WhatsApp
							</a>
							<ul className="chips">
								{Object.entries(contenido.negocio.redes)
									.filter(([, url]) => url)
									.map(([nombre, url]) => (
										<li key={nombre}>
											<a
												className="enlace"
												href={url ?? undefined}
												target="_blank"
												rel="noopener noreferrer"
											>
												{nombre === "instagram"
													? "Instagram"
													: nombre === "tiktok"
														? "TikTok"
														: "Facebook"}
											</a>
										</li>
									))}
							</ul>
						</section>
					</div>
				</section>
			)}
		</ConContenido>
	);
}
