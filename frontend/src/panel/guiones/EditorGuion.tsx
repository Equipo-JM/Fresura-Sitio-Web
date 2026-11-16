import type { Guion } from "../../../../backend/supabase/functions/_shared/esquemas/guion";

const CAMPOS = [
	["titulo", "Título", 80],
	["gancho", "Gancho", 300],
	["llamado_accion", "Llamado a la acción", 200],
	["texto_publicacion", "Texto de la publicación", 2200],
	["musica_sugerida", "Música sugerida", 200],
	["notas_produccion", "Notas de producción", 600],
] as const;

/** Edición por partes; mantiene escenas ordenadas y permite corregir sus tiempos. */
export function EditorGuion({
	guion,
	cambiar,
	bloqueado,
}: {
	guion: Guion;
	cambiar: (guion: Guion) => void;
	bloqueado: boolean;
}) {
	return (
		<fieldset disabled={bloqueado} className="guiones-editor">
			<legend>Contenido del guion</legend>
			{CAMPOS.slice(0, 2).map(([campo, nombre, maximo]) => (
				<label key={campo}>
					{nombre}
					<textarea
						name={campo}
						autoComplete="off"
						maxLength={maximo}
						value={guion[campo]}
						onChange={(e) => cambiar({ ...guion, [campo]: e.target.value })}
					/>
				</label>
			))}
			{guion.escenas.map((escena, indice) => {
				const editar = (cambio: Partial<typeof escena>) =>
					cambiar({
						...guion,
						escenas: guion.escenas.map((actual, i) =>
							i === indice ? { ...actual, ...cambio } : actual,
						),
					});
				return (
					// biome-ignore lint/suspicious/noArrayIndexKey: El contrato no trae identificadores; el editor conserva la cantidad y el orden de las escenas.
					<fieldset key={`escena-${indice + 1}`}>
						<legend>Escena {indice + 1}</legend>
						<label>
							Inicio (segundos)
							<input
								name={`escena-${indice + 1}-inicio`}
								aria-label={`Inicio (segundos) · escena ${indice + 1}`}
								type="number"
								min={0}
								max={59}
								step={1}
								value={Number.isNaN(escena.inicio_s) ? "" : escena.inicio_s}
								onChange={(e) => editar({ inicio_s: e.target.valueAsNumber })}
							/>
						</label>
						<label>
							Fin (segundos)
							<input
								name={`escena-${indice + 1}-fin`}
								aria-label={`Fin (segundos) · escena ${indice + 1}`}
								type="number"
								min={1}
								max={60}
								step={1}
								value={Number.isNaN(escena.fin_s) ? "" : escena.fin_s}
								onChange={(e) => editar({ fin_s: e.target.valueAsNumber })}
							/>
						</label>
						<label>
							Qué se ve
							<textarea
								name={`escena-${indice + 1}-imagen`}
								autoComplete="off"
								aria-label={`Qué se ve · escena ${indice + 1}`}
								maxLength={300}
								value={escena.que_se_ve}
								onChange={(e) => editar({ que_se_ve: e.target.value })}
							/>
						</label>
						<label>
							Texto en pantalla
							<textarea
								name={`escena-${indice + 1}-texto`}
								autoComplete="off"
								aria-label={`Texto en pantalla · escena ${indice + 1}`}
								maxLength={120}
								value={escena.texto_pantalla}
								onChange={(e) => editar({ texto_pantalla: e.target.value })}
							/>
						</label>
						<label>
							Voz o diálogo
							<textarea
								name={`escena-${indice + 1}-voz`}
								autoComplete="off"
								aria-label={`Voz o diálogo · escena ${indice + 1}`}
								maxLength={400}
								value={escena.voz}
								onChange={(e) => editar({ voz: e.target.value })}
							/>
						</label>
					</fieldset>
				);
			})}
			{CAMPOS.slice(2).map(([campo, nombre, maximo]) => (
				<label key={campo}>
					{nombre}
					<textarea
						name={campo}
						autoComplete="off"
						maxLength={maximo}
						value={guion[campo]}
						onChange={(e) => cambiar({ ...guion, [campo]: e.target.value })}
					/>
				</label>
			))}
		</fieldset>
	);
}
