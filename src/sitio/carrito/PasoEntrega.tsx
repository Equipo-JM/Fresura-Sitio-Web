import type { Contenido } from "../../../supabase/functions/_shared/esquemas/contenido";
import {
	type DatosEntrega,
	type Entrega,
	MAX_OBSERVACIONES,
	type validarDatos,
} from "../../compartido/carrito/reglas";
import { Icono } from "../../compartido/componentes/Icono";
import { useCobertura } from "../../compartido/ubicacion/useCobertura";
import { MarcaPorValidar } from "../MarcaPorValidar";

/** Mensaje de la comprobación de cobertura; la sede sale del contenido. */
function mensajeCobertura(
	estado: "dentro" | "fuera" | "sin-permiso",
	nombreSede: string,
): string {
	if (estado === "dentro")
		return "¡Llegamos a tu zona! Puedes recoger o pedir domicilio.";
	if (estado === "fuera")
		return `Por ahora no llegamos a tu zona. Puedes recoger en ${nombreSede}.`;
	return "No pudimos ver tu ubicación. Puedes elegir recoger o domicilio y lo confirmamos por WhatsApp.";
}

type Errores = ReturnType<typeof validarDatos>;

/**
 * Paso 2, con los mismos datos que el formulario de pago de la referencia
 * (Contacto, Entrega y métodos de envío). Solo el pago cambia: se acuerda por WhatsApp.
 */
export function PasoEntrega({
	contenido,
	entrega,
	datos,
	errores,
	onEntrega,
	onDatos,
	onRevisar,
	onVolver,
}: {
	contenido: Contenido;
	entrega: Entrega;
	datos: DatosEntrega;
	errores: Errores;
	onEntrega: (valor: Entrega) => void;
	onDatos: (cambios: Partial<DatosEntrega>) => void;
	onRevisar: () => void;
	onVolver: () => void;
}) {
	const sede = contenido.negocio.sedes.find((s) => s.atiende_pedidos);
	const nombreSede = sede?.nombre ?? "la sede";
	const cobertura = useCobertura(
		sede?.ubicacion ?? { lat: 4.6347, lng: -74.0785 },
		sede?.radio_domicilio_km ?? 5,
	);
	const domicilio = entrega === "domicilio";
	const fuera = cobertura.estado === "fuera";

	function campo(
		id: keyof DatosEntrega,
		etiqueta: string,
		opciones: {
			tipo?: string;
			autoComplete?: string;
			opcional?: boolean;
			ancho?: boolean;
			ayuda?: string;
		} = {},
	) {
		const error = errores[id];
		const ayudaId = `${id}-ayuda`;
		const errorId = `${id}-error`;
		return (
			<div className={`campo${opciones.ancho ? " ancho" : ""}`}>
				<label htmlFor={`c-${id}`}>
					{etiqueta}{" "}
					<span className="opc">
						{opciones.opcional ? "(opcional)" : "(obligatorio)"}
					</span>
				</label>
				<input
					id={`c-${id}`}
					type={opciones.tipo ?? "text"}
					value={datos[id]}
					autoComplete={opciones.autoComplete}
					required={!opciones.opcional}
					aria-invalid={error ? true : undefined}
					aria-describedby={
						[opciones.ayuda ? ayudaId : null, error ? errorId : null]
							.filter(Boolean)
							.join(" ") || undefined
					}
					onChange={(e) => onDatos({ [id]: e.target.value })}
				/>
				{opciones.ayuda && (
					<p className="cf-ayuda" id={ayudaId}>
						{opciones.ayuda}
					</p>
				)}
				{error && (
					<p className="error" id={errorId}>
						<Icono nombre="alerta" />
						<span>{error}</span>
					</p>
				)}
			</div>
		);
	}

	return (
		<form
			className="form form-pago"
			noValidate
			onSubmit={(e) => {
				e.preventDefault();
				onRevisar();
			}}
		>
			<h1 id="titulo-paso" tabIndex={-1}>
				Entrega y <em>datos</em>
			</h1>
			{Object.keys(errores).length > 0 && (
				<p className="alerta" role="alert">
					<Icono nombre="alerta" />
					<span>Revisa los campos marcados.</span>
				</p>
			)}

			<section className="bloque-form" aria-labelledby="t-contacto">
				<h2 id="t-contacto">Contacto</h2>
				<div className="rejilla">
					{campo("correo", "Correo electrónico", {
						tipo: "email",
						autoComplete: "email",
						ancho: true,
					})}
					{campo("telefono", "Teléfono", {
						tipo: "tel",
						autoComplete: "tel-national",
						ancho: true,
						ayuda: "Por si necesitamos contactarte sobre tu pedido.",
					})}
				</div>
			</section>

			<section className="bloque-form" aria-labelledby="t-entrega">
				<h2 id="t-entrega">Entrega</h2>
				<fieldset>
					<legend className="oculto">Elige una forma de entrega</legend>
					<div className="segmentos">
						<label
							className={`segmento${domicilio ? " elegido" : ""}${fuera ? " bloqueado" : ""}`}
						>
							<input
								type="radio"
								className="oculto"
								name="entrega"
								value="domicilio"
								checked={domicilio}
								disabled={fuera}
								onChange={() => onEntrega("domicilio")}
							/>
							<Icono nombre="paquete" />
							<strong>Domicilio</strong>
							<span>
								{fuera ? "No disponible en tu zona" : `Desde ${nombreSede}`}
							</span>
						</label>
						<label
							className={`segmento${entrega === "recoger" ? " elegido" : ""}`}
						>
							<input
								type="radio"
								className="oculto"
								name="entrega"
								value="recoger"
								checked={entrega === "recoger"}
								onChange={() => onEntrega("recoger")}
							/>
							<Icono nombre="ubicacion" />
							<strong>Recoger en {nombreSede}</strong>
							{sede && <span>{sede.direccion}</span>}
						</label>
					</div>
					{errores.entrega && (
						<p className="error error-entrega">
							<Icono nombre="alerta" />
							<span>{errores.entrega}</span>
						</p>
					)}
				</fieldset>

				<div className="rejilla">
					<div className="campo">
						<label htmlFor="c-pais">País / Región</label>
						<select id="c-pais" value="CO" onChange={() => undefined}>
							<option value="CO">Colombia</option>
						</select>
					</div>
					{campo("nombre", "Nombre", { autoComplete: "given-name" })}
					{campo("apellidos", "Apellidos", { autoComplete: "family-name" })}
					{domicilio && (
						<>
							{campo("empresa", "Empresa", {
								autoComplete: "organization",
								opcional: true,
								ancho: true,
							})}
							{campo("direccion", "Dirección", {
								autoComplete: "address-line1",
								ancho: true,
							})}
							{campo("casa", "Casa, apartamento, etc.", {
								autoComplete: "address-line2",
								opcional: true,
								ancho: true,
							})}
							{campo("barrio", "Barrio", { ancho: true })}
							<div className="fila-tres">
								{campo("ciudad", "Ciudad", { autoComplete: "address-level2" })}
							</div>
						</>
					)}
				</div>

				{/* Si quedó fuera de la zona se sigue mostrando el resultado, aunque ya no esté en domicilio. */}
				{(domicilio || fuera) && (
					<div className="cobertura">
						<button
							type="button"
							className="boton"
							onClick={() =>
								cobertura.comprobar((resultado) => {
									// «Domicilio» queda deshabilitado fuera de la zona: no puede seguir elegido.
									if (resultado === "fuera" && domicilio) onEntrega("");
								})
							}
							disabled={cobertura.estado === "buscando"}
						>
							<Icono nombre="ubicacion" />
							{cobertura.estado === "buscando"
								? "Comprobando…"
								: "Comprobar cobertura"}
						</button>
						<p className="chico">
							Usamos tu ubicación solo aquí, para ver si llegamos a tu zona. No
							se envía ni se guarda.
						</p>
						{cobertura.estado !== "sin-comprobar" &&
							cobertura.estado !== "buscando" && (
								<p
									className={`resultado${cobertura.estado === "dentro" ? " ok" : ""}`}
									role="status"
								>
									<Icono
										nombre={cobertura.estado === "dentro" ? "ok" : "alerta"}
									/>
									<span>{mensajeCobertura(cobertura.estado, nombreSede)}</span>
								</p>
							)}
					</div>
				)}

				<label className="casilla">
					<input type="checkbox" disabled />
					<span>
						Guardar mi información y consultar más rápidamente la próxima vez{" "}
						<MarcaPorValidar />
					</span>
				</label>
			</section>

			<section className="bloque-form" aria-labelledby="t-pago">
				<h2 id="t-pago">Pago</h2>
				<div className="pago-info">
					<Icono nombre="chat" />
					<p>
						<strong>Pagas al confirmar por WhatsApp.</strong> Allí te damos el
						total con el domicilio y los medios de pago. Este sitio no recibe
						pagos. <MarcaPorValidar />
					</p>
				</div>
			</section>

			<div className="campo">
				<label htmlFor="c-observaciones">
					Observaciones <span className="opc">(opcional)</span>
				</label>
				<textarea
					id="c-observaciones"
					maxLength={MAX_OBSERVACIONES}
					value={datos.observaciones}
					onChange={(e) => onDatos({ observaciones: e.target.value })}
					aria-describedby="c-observaciones-cuenta"
				/>
				<span className="contador-c" id="c-observaciones-cuenta">
					{datos.observaciones.length} de {MAX_OBSERVACIONES}
				</span>
			</div>

			<div className="acciones-fila">
				<button type="submit" className="boton">
					Revisar pedido
				</button>
				<button type="button" className="boton secundario" onClick={onVolver}>
					Volver a tu pedido
				</button>
			</div>
		</form>
	);
}
