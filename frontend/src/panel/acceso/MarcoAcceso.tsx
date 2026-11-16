import type { ReactNode } from "react";

/** Fondo, logo y tarjeta comunes a las pantallas del acceso al panel. */
export function MarcoAcceso({
	titulo,
	etiqueta,
	onEnviar,
	children,
}: {
	titulo: ReactNode;
	/** Etiqueta sobre el título, por ejemplo «Modo demostración». */
	etiqueta?: string;
	onEnviar?: () => void;
	children: ReactNode;
}) {
	return (
		<main className="panel-acceso" id="contenido">
			<img
				className="panel-acceso-logo"
				src="/marca/logo-vertical-court-bouillon.svg"
				alt="Fresura"
				width="200"
				height="97"
			/>
			{/* Sin onEnviar, la tarjeta no es formulario: su contenido trae el propio. */}
			{onEnviar ? (
				<form
					className="panel-tarjeta"
					noValidate
					onSubmit={(e) => {
						e.preventDefault();
						onEnviar();
					}}
				>
					{etiqueta && <p className="panel-demo-etiqueta">{etiqueta}</p>}
					<h1>{titulo}</h1>
					{children}
				</form>
			) : (
				<div className="panel-tarjeta">
					{etiqueta && <p className="panel-demo-etiqueta">{etiqueta}</p>}
					<h1>{titulo}</h1>
					{children}
				</div>
			)}
		</main>
	);
}
