import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Database } from "../../tipos/database.types";
import {
	crearServicioVersiones,
	type EstadoVersiones,
} from "./servicioVersiones";

/** Sincroniza el panel con las versiones; serializa acciones para no usar revisiones viejas. */
export function useVersiones(cliente: SupabaseClient<Database>) {
	const servicio = useMemo(() => crearServicioVersiones(cliente), [cliente]);
	const [versiones, setVersiones] = useState<EstadoVersiones | null>(null);
	const [ocupado, setOcupado] = useState(false);
	const [error, setError] = useState("");
	const [mensaje, setMensaje] = useState("");
	const bloqueo = useRef(false);

	useEffect(() => {
		let vigente = true;
		servicio
			.leer()
			.then((datos) => {
				if (vigente) setVersiones(datos);
			})
			.catch(() => {
				if (vigente)
					setError("No pudimos cargar las versiones. Inténtalo de nuevo.");
			});
		return () => {
			vigente = false;
		};
	}, [servicio]);

	const ejecutar = useCallback(
		async (accion: () => Promise<void>, exito = "") => {
			if (bloqueo.current) return false;
			bloqueo.current = true;
			setOcupado(true);
			setError("");
			setMensaje("");
			try {
				await accion();
				setMensaje(exito);
				return true;
			} catch (fallo) {
				setError(
					fallo instanceof Error
						? fallo.message
						: "No pudimos completar la acción. Inténtalo de nuevo.",
				);
				return false;
			} finally {
				bloqueo.current = false;
				setOcupado(false);
			}
		},
		[],
	);

	const recargar = () =>
		ejecutar(async () => setVersiones(await servicio.leer()));
	const editar = () =>
		ejecutar(async () => {
			if (!versiones?.publicada || versiones.borrador) return;
			const borrador = await servicio.editar(versiones.publicada);
			setVersiones({ ...versiones, borrador });
		}, "Tus cambios están guardados. Aún no se ven en el sitio.");
	const guardar = (json: unknown = versiones?.borrador?.json) =>
		ejecutar(async () => {
			if (!versiones?.borrador) throw new Error("No hay cambios por publicar.");
			const borrador = await servicio.guardar(versiones.borrador, json);
			setVersiones({ ...versiones, borrador });
		}, "Tus cambios están guardados. Aún no se ven en el sitio.");
	const descartar = () =>
		ejecutar(async () => {
			if (!versiones?.borrador) return;
			await servicio.descartar(versiones.borrador);
			setVersiones({ ...versiones, borrador: null });
		}, "Cambios descartados.");
	const publicar = (aprobado: boolean) =>
		ejecutar(async () => {
			if (!versiones?.borrador) throw new Error("No hay cambios por publicar.");
			await servicio.publicar(versiones.borrador, aprobado);
			setVersiones(await servicio.leer());
		}, "¡Listo!");
	const restaurar = () =>
		ejecutar(async () => {
			if (!versiones?.anterior) throw new Error("No hay una versión anterior.");
			await servicio.restaurar();
			setVersiones(await servicio.leer());
		}, "¡Listo!");

	return {
		versiones,
		ocupado,
		error,
		mensaje,
		recargar,
		editar,
		guardar,
		descartar,
		publicar,
		restaurar,
	};
}
