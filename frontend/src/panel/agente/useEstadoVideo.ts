import { useEffect, useRef } from "react";
import type { z } from "zod";
import type { esquemaRespuestaEstadoVideo } from "../../../../backend/supabase/functions/_shared/esquemas/chat";

type RespuestaEstadoVideo = z.infer<typeof esquemaRespuestaEstadoVideo>;

/** Pausa entre consultas: D-ID tarda uno o varios minutos en renderizar. */
export const INTERVALO_ESTADO_VIDEO_MS = 15_000;

/** Tope de consultas automáticas (unos 10 minutos) para no consultar sin fin. */
export const MAXIMO_CONSULTAS_VIDEO = 40;

/** Aviso local cuando D-ID tarda más que el tope; no se guarda en la conversación. */
export const AVISO_VIDEO_DEMORADO =
	"D-ID está tardando más de lo normal. Escribe «estado del video» para consultar de nuevo.";

/**
 * Consulta el estado del video cada cierto tiempo mientras `activo` sea verdadero
 * y entrega el mensaje final una sola vez. Cambiar `clave` (otra conversación u
 * otro mensaje) cancela la espera en curso y empieza de nuevo.
 */
export function useEstadoVideo({
	activo,
	clave,
	consultar,
	alTerminar,
}: {
	activo: boolean;
	clave: string;
	consultar: (signal: AbortSignal) => Promise<RespuestaEstadoVideo>;
	alTerminar: (mensaje: string) => void;
}) {
	// Las funciones cambian en cada render; con refs el temporizador no se reinicia.
	const consultarRef = useRef(consultar);
	const alTerminarRef = useRef(alTerminar);
	useEffect(() => {
		consultarRef.current = consultar;
		alTerminarRef.current = alTerminar;
	});
	useEffect(() => {
		if (!activo || !clave) return;
		const control = new AbortController();
		let temporizador: ReturnType<typeof setTimeout> | undefined;
		let consultas = 0;
		async function revisar() {
			consultas++;
			try {
				const respuesta = await consultarRef.current(control.signal);
				if (control.signal.aborted) return;
				if (respuesta.estado !== "preparando") {
					alTerminarRef.current(respuesta.mensaje);
					return;
				}
			} catch {
				// Un fallo de red o de sesión no detiene el render: se reintenta.
				if (control.signal.aborted) return;
			}
			if (consultas >= MAXIMO_CONSULTAS_VIDEO) {
				alTerminarRef.current(AVISO_VIDEO_DEMORADO);
				return;
			}
			temporizador = setTimeout(revisar, INTERVALO_ESTADO_VIDEO_MS);
		}
		temporizador = setTimeout(revisar, INTERVALO_ESTADO_VIDEO_MS);
		return () => {
			control.abort();
			clearTimeout(temporizador);
		};
	}, [activo, clave]);
}
