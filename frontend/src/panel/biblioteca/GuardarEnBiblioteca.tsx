import { useState } from "react";

/** Guarda una entrega del chat una sola vez; el estado queda visible para lectores de pantalla. */
export function GuardarEnBiblioteca({
	guardar,
}: {
	guardar: () => Promise<void>;
}) {
	const [estado, setEstado] = useState<"listo" | "guardando" | "guardado">(
		"listo",
	);
	const [error, setError] = useState("");

	async function alGuardar() {
		setEstado("guardando");
		setError("");
		try {
			await guardar();
			setEstado("guardado");
		} catch (fallo) {
			setEstado("listo");
			setError(
				fallo instanceof Error ? fallo.message : "No pudimos guardar la pieza.",
			);
		}
	}

	return (
		<>
			<button
				className="boton secundario compacto"
				type="button"
				disabled={estado !== "listo"}
				onClick={() => void alGuardar()}
			>
				{estado === "guardado"
					? "Guardado en la biblioteca"
					: estado === "guardando"
						? "Guardando…"
						: "Guardar en biblioteca"}
			</button>
			{error && <span role="alert">{error}</span>}
		</>
	);
}
