import { type ReactNode, useId, useRef } from "react";

/** Ficha nativa: puede abrirse desde una fila o directamente al seleccionar un producto. */
export function FichaPanel({
	seccion,
	titulo,
	resumen,
	children,
	directa = false,
	alCerrar,
}: {
	seccion: string;
	titulo: string;
	resumen?: string;
	children: ReactNode;
	directa?: boolean;
	alCerrar?: () => void;
}) {
	const ref = useRef<HTMLDialogElement>(null);
	const id = useId();
	function abrir(d: HTMLDialogElement) {
		if (!d.open) d.showModal();
	}
	return (
		<>
			{!directa && (
				<button
					className="ficha-fila"
					type="button"
					onClick={() => ref.current && abrir(ref.current)}
				>
					<span>
						<strong>{titulo}</strong>
						{resumen && <small>{resumen}</small>}
					</span>
					<span aria-hidden="true">›</span>
				</button>
			)}
			<dialog
				className="ficha-panel"
				aria-labelledby={id}
				ref={(d) => {
					ref.current = d;
					if (d && directa) abrir(d);
				}}
				onClose={alCerrar}
			>
				<header>
					<button
						type="button"
						aria-label={directa ? "Volver a productos" : "Cerrar ficha"}
						onClick={() => ref.current?.close()}
					>
						×
					</button>
					<small>{seccion}</small>
					<h2 id={id}>{titulo}</h2>
				</header>
				{children}
				<button
					className="boton secundario"
					type="button"
					onClick={() => ref.current?.close()}
				>
					Listo
				</button>
			</dialog>
		</>
	);
}
