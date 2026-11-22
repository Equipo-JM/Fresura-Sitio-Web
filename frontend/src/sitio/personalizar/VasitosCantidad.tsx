/** Vasitos que se dibujan como máximo; desde ahí se resume con «+N». */
const MAX_VISIBLES = 6;

/**
 * Un vasito por unidad junto al selector de cantidad. Es decorativo: la
 * cantidad ya se lee en el número, así que va oculto para lectores de
 * pantalla. Cada vasito nuevo entra con un saltito (CSS, apagado con
 * `prefers-reduced-motion`).
 */
export function VasitosCantidad({ cantidad }: { cantidad: number }) {
	// Número de cada unidad (1, 2, 3…): como clave es estable, así que al
	// subir la cantidad solo se animan los vasitos nuevos.
	const unidades = Array.from(
		{ length: Math.min(cantidad, MAX_VISIBLES) },
		(_, i) => i + 1,
	);
	return (
		<span className="vasitos" aria-hidden="true">
			{unidades.map((unidad) => (
				<svg
					key={unidad}
					className="vasito"
					viewBox="0 0 28 34"
					width="24"
					height="30"
					aria-hidden="true"
				>
					<path
						d="M4 7h20l-2.6 23a2 2 0 0 1-2 1.8H8.6a2 2 0 0 1-2-1.8L4 7z"
						fill="var(--color-flamingo)"
						stroke="var(--color-peat-brown)"
						strokeWidth="1.6"
						strokeLinejoin="round"
					/>
					<path
						d="M2.5 7h23"
						stroke="var(--color-peat-brown)"
						strokeWidth="2.2"
						strokeLinecap="round"
					/>
					<path
						d="M10.5 13.5c-1.4-1.6-.6-3.6 1.3-3.6 1 0 1.6.5 2.2 1.2.6-.7 1.2-1.2 2.2-1.2 1.9 0 2.7 2 1.3 3.6L14 17.5l-3.5-4z"
						fill="var(--color-we-peep)"
					/>
				</svg>
			))}
			{cantidad > MAX_VISIBLES && (
				<span className="vasitos-mas">+{cantidad - MAX_VISIBLES}</span>
			)}
		</span>
	);
}
