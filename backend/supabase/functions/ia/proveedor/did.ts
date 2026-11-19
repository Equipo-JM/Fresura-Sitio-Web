import { z } from "zod";

const API_DID = "https://api.d-id.com";

/** Recurso documentado para solicitar y consultar el mismo trabajo de D-ID. */
export type RecursoDid = "talks" | "expressives";
const inicio = z.object({
	id: z
		.string()
		.regex(/^[\w-]+$/)
		.max(120),
});
const estado = z.object({
	status: z.string(),
	result_url: z.url({ protocol: /^https$/ }).optional(),
});

/** Resultado del intento de envío. Un fallo ambiguo no autoriza otro POST. */
export type EnvioDid =
	| { tipo: "enviado"; id: string; recurso: RecursoDid }
	| { tipo: "rechazado"; mensaje: string }
	| { tipo: "indeterminado" };

/** Consulta autenticada de un video que ya tiene identificador de D-ID. */
export type EstadoDid = z.infer<typeof estado>;

/** Perfil fijo seleccionado por el operador en los secretos de Supabase. */
export type PerfilDid =
	| { tipo: "foto"; imagen: string; voz: string }
	| {
			tipo: "expresivo";
			avatar: string;
			sentimiento: string;
			voz: string;
			modeloVoz: string;
	  };

/** Llama a D-ID desde el servidor con el perfil fijo de Fresura. */
export function crearProveedorDid(config: {
	clave: string;
	perfil: PerfilDid;
	pedir?: typeof fetch;
}) {
	const { perfil } = config;
	const recurso: RecursoDid =
		perfil.tipo === "expresivo" ? "expressives" : "talks";
	const presentadora =
		perfil.tipo === "expresivo"
			? { avatar_id: perfil.avatar, sentiment_id: perfil.sentimiento }
			: { source_url: perfil.imagen };
	const voz =
		perfil.tipo === "expresivo"
			? { type: "elevenlabs", voice_id: perfil.voz, model_id: perfil.modeloVoz }
			: { type: "microsoft", voice_id: perfil.voz };
	const pedir = config.pedir ?? fetch;
	const headers = { Authorization: `Basic ${config.clave}` };
	return {
		async generar(dialogo: string): Promise<EnvioDid> {
			try {
				const respuesta = await pedir(`${API_DID}/${recurso}`, {
					method: "POST",
					headers: { ...headers, "Content-Type": "application/json" },
					redirect: "error",
					signal: AbortSignal.timeout(15_000),
					body: JSON.stringify({
						name: "Presentadora Fresura",
						...presentadora,
						script: {
							type: "text",
							input: dialogo,
							provider: voz,
						},
					}),
				});
				if ([400, 401, 402, 403, 422, 429, 451].includes(respuesta.status)) {
					return {
						tipo: "rechazado",
						mensaje:
							respuesta.status === 402
								? "D-ID rechazó el envío por falta de créditos."
								: "D-ID rechazó el envío. Revisa el acceso, el cupo y la configuración de la presentadora.",
					};
				}
				if (!respuesta.ok) return { tipo: "indeterminado" };
				const aceptado = inicio.safeParse(await respuesta.json());
				return aceptado.success
					? { tipo: "enviado", id: aceptado.data.id, recurso }
					: { tipo: "indeterminado" };
			} catch {
				return { tipo: "indeterminado" };
			}
		},
		async consultar(
			recurso: RecursoDid,
			id: string,
		): Promise<EstadoDid | null> {
			try {
				const respuesta = await pedir(
					`${API_DID}/${recurso}/${encodeURIComponent(id)}`,
					{
						headers,
						redirect: "error",
						signal: AbortSignal.timeout(10_000),
					},
				);
				if (!respuesta.ok) return null;
				const video = estado.safeParse(await respuesta.json());
				return video.success ? video.data : null;
			} catch {
				return null;
			}
		},
	};
}
