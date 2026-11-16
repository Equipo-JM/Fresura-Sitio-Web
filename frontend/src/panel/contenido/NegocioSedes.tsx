import { Campo, ErrorCampo, ListaCampos, useEdicion } from "./Campos";

/** Presentación, contacto y sedes; conserva la sede de pedidos hasta resolver DT-01 §19.3. */
export function NegocioSedes() {
	const { contenido, cambiar } = useEdicion();
	const { sedes } = contenido.negocio;
	return (
		<section aria-labelledby="titulo-negocio">
			<h2 id="titulo-negocio">Negocio y sedes</h2>
			<Campo
				ruta="negocio.presentacion.titulo"
				etiqueta="Título de presentación"
				maximo={80}
			/>
			<Campo
				ruta="negocio.presentacion.texto"
				etiqueta="Presentación del negocio"
				tipo="textarea"
				maximo={600}
			/>
			<Campo
				ruta="negocio.whatsapp"
				etiqueta="WhatsApp del negocio (57 y número de celular)"
				tipo="tel"
			/>
			<ErrorCampo ruta="negocio.sedes" />
			{sedes.map((sede, i) => {
				const ruta = `negocio.sedes.${i}`;
				return (
					<fieldset key={ruta} className="panel-bloque">
						<legend>Sede: {sede.nombre || "Nueva"}</legend>
						<Campo
							ruta={`${ruta}.nombre`}
							etiqueta="Nombre de la sede"
							maximo={120}
						/>
						<Campo
							ruta={`${ruta}.direccion`}
							etiqueta="Dirección"
							maximo={120}
						/>
						<Campo
							ruta={`${ruta}.ubicacion.lat`}
							etiqueta="Latitud"
							tipo="number"
						/>
						<Campo
							ruta={`${ruta}.ubicacion.lng`}
							etiqueta="Longitud"
							tipo="number"
						/>
						<p>
							{sede.atiende_pedidos
								? "Esta sede atiende los pedidos del sitio."
								: "Esta sede es un punto de venta."}
						</p>
						{sede.atiende_pedidos && (
							<Campo
								ruta={`${ruta}.radio_domicilio_km`}
								etiqueta="Radio de domicilio en kilómetros (de 0,5 a 50)"
								tipo="number"
							/>
						)}
						<Campo
							ruta={`${ruta}.whatsapp`}
							etiqueta="WhatsApp de la sede (vacío: usa el del negocio)"
							tipo="tel"
							opcional
						/>
						<ListaCampos
							ruta={`${ruta}.horarios`}
							titulo="Horario"
							agregar={() =>
								cambiar(`${ruta}.horarios`, [
									...sede.horarios,
									{ dias: "", horas: "" },
								])
							}
						>
							{sede.horarios.map((_, j) => {
								const horario = `${ruta}.horarios.${j}`;
								return (
									<fieldset key={horario} className="panel-bloque">
										<legend>Horario {j + 1}</legend>
										<Campo
											ruta={`${horario}.dias`}
											etiqueta="Días"
											maximo={60}
										/>
										<Campo
											ruta={`${horario}.horas`}
											etiqueta="Horas"
											maximo={60}
										/>
										<button
											type="button"
											className="boton-texto"
											disabled={sede.horarios.length === 1}
											onClick={() =>
												cambiar(
													`${ruta}.horarios`,
													sede.horarios.filter((_, k) => k !== j),
												)
											}
										>
											Quitar horario {j + 1}
										</button>
									</fieldset>
								);
							})}
						</ListaCampos>
						<button
							type="button"
							className="boton-texto"
							disabled={sede.atiende_pedidos || sedes.length === 1}
							onClick={() =>
								cambiar(
									"negocio.sedes",
									sedes.filter((_, j) => j !== i),
								)
							}
						>
							Quitar sede {sede.nombre}
						</button>
					</fieldset>
				);
			})}
			<button
				type="button"
				className="boton secundario"
				disabled={sedes.length >= 5}
				onClick={() =>
					cambiar("negocio.sedes", [
						...sedes,
						{
							id: "",
							nombre: "",
							direccion: "",
							horarios: [{ dias: "", horas: "" }],
							ubicacion: { lat: Number.NaN, lng: Number.NaN },
							atiende_pedidos: false,
							radio_domicilio_km: null,
							whatsapp: null,
						},
					])
				}
			>
				Agregar sede
			</button>
			<h3>Redes</h3>
			<p>Deja el enlace vacío para ocultarlo.</p>
			<Campo
				ruta="negocio.redes.instagram"
				etiqueta="Instagram"
				tipo="url"
				opcional
			/>
			<Campo
				ruta="negocio.redes.tiktok"
				etiqueta="TikTok"
				tipo="url"
				opcional
			/>
			<Campo
				ruta="negocio.redes.facebook"
				etiqueta="Facebook"
				tipo="url"
				opcional
			/>
		</section>
	);
}
