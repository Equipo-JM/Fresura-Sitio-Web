import type { Contenido } from "../../../../backend/supabase/functions/_shared/esquemas/contenido";
import {
	type DatosEntrega,
	type Entrega,
	MAX_OBSERVACIONES,
	type validarDatos,
} from "../../compartido/carrito/reglas";
import { Icono } from "../../compartido/componentes/Icono";
import { useCobertura } from "../../compartido/ubicacion/useCobertura";

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
	const numeroErrores = Object.values(errores).filter(Boolean).length;

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
			<div
				className={`cf${opciones.ancho ? " ancho" : ""}${error ? " invalido" : ""}`}
			>
				<label htmlFor={`c-${id}`}>
					{etiqueta}{" "}
					{opciones.opcional && <span className="opc">(opcional)</span>}
				</label>
				<input
					id={`c-${id}`}
					name={id}
					inputMode={
						opciones.tipo === "tel"
							? "tel"
							: opciones.tipo === "email"
								? "email"
								: undefined
					}
					spellCheck={opciones.tipo === "email" ? false : undefined}
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
			id="form-carrito"
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
			{numeroErrores > 0 && (
				<p className="alerta" role="alert">
					<Icono nombre="alerta" />
					<span>
						{numeroErrores === 1
							? "Hay 1 dato por completar o corregir. Revisa el campo marcado."
							: `Hay ${numeroErrores} datos por completar o corregir. Revisa los campos marcados.`}
					</span>
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
								id="entrega-domicilio"
								value="domicilio"
								checked={domicilio}
								disabled={fuera}
								onChange={() => onEntrega("domicilio")}
							/>
							<Icono nombre="paquete" />
							<strong>Domicilio</strong>
							{fuera && <span>No disponible en tu zona</span>}
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
							<strong>
								Recoger en {nombreSede.replace(/^Sede /, "sede ")}
							</strong>
							{sede && (
								<span>
									{sede.horarios[0]?.horas.split(" Cierre por almuerzo:")[0]}
								</span>
							)}
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
					<div className="cf">
						<label htmlFor="c-pais">País / región</label>
						<select
							id="c-pais"
							name="pais"
							autoComplete="country"
							value="CO"
							onChange={() => undefined}
						>
							<option value="CO">Colombia</option>
						</select>
						<Icono nombre="abajo" />
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
					{campo("telefono", "Teléfono", {
						tipo: "tel",
						autoComplete: "tel-national",
						ancho: true,
						ayuda:
							"Por si necesitamos contactarte sobre tu pedido: te escribimos por WhatsApp.",
					})}
				</div>

				<label className="casilla">
					<input type="checkbox" disabled />
					<span>
						Guardar mi información y consultar más rápidamente la próxima vez
					</span>
				</label>
			</section>

			{entrega && (
				<section className="bloque-form" aria-labelledby="t-metodo">
					<h2 id="t-metodo">
						{domicilio ? "Métodos de envío" : "Punto de recogida"}
					</h2>
					<div className="metodo">
						<Icono nombre="ok" />
						<div>
							<strong>
								{domicilio
									? `Domicilio desde ${nombreSede.replace(/^Sede /, "sede ")}`
									: nombreSede}
							</strong>
							<span>
								{domicilio
									? `Hasta ${sede?.radio_domicilio_km ?? 5} km en línea recta.`
									: `${sede?.direccion}, Bogotá · ${sede?.horarios[0].horas.split(" Cierre por almuerzo:")[0]}`}
							</span>
						</div>
						<span className="metodo-precio">
							{domicilio ? "Por confirmar" : "Sin costo"}
						</span>
					</div>
				</section>
			)}
			{/* El resultado sigue visible al salir de domicilio para poder elegir recogida. */}
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
						Usamos tu ubicación solo aquí, para ver si llegamos a tu zona. No se
						envía ni se guarda.
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

			<section className="bloque-form" aria-labelledby="t-pago">
				<h2 id="t-pago">Pago</h2>
				<div className="pago-info">
					<Icono nombre="chat" />
					<p>
						<strong>Pagas al confirmar por WhatsApp.</strong> Allí te damos el
						total con el domicilio y los medios de pago. Este sitio no recibe
						pagos.
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
