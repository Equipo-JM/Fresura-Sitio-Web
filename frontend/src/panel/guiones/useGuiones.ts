import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
	Guion,
	InstruccionGuion,
} from "../../../../backend/supabase/functions/_shared/esquemas/guion";
import type { Database } from "../../tipos/database.types";
import {
	crearServicioGuiones,
	type GuionGuardado,
	leerGuionGuardado,
	type PromptVideo,
	textoGuion,
} from "./servicioGuiones";

type Trabajo = {
	instruccion: InstruccionGuion;
	productoNombre: string;
	generado: Guion;
	editado: Guion;
	fila: GuionGuardado;
	sinGuardar: boolean;
};

/** Conserva las ediciones ante errores; serializa las acciones y protege la salida. */
export function useGuiones(cliente: SupabaseClient<Database>) {
	const servicio = useMemo(() => crearServicioGuiones(cliente), [cliente]);
	const [datos, setDatos] = useState<Awaited<
		ReturnType<typeof servicio.cargar>
	> | null>(null);
	const [trabajo, setTrabajo] = useState<Trabajo | null>(null);
	const [prompt, setPrompt] = useState<PromptVideo | null>(null);
	const [ocupado, setOcupado] = useState(true);
	const [error, setError] = useState("");
	const [mensaje, setMensaje] = useState("");
	const bloqueo = useRef(false);
	const avisoError = useRef<HTMLParagraphElement>(null);
	const tituloEditor = useRef<HTMLHeadingElement>(null);
	const aperturaPendiente = useRef<string | null>(null);
	const filaAbierta = trabajo?.fila?.id;
	const sinGuardar = trabajo?.sinGuardar ?? false;
	useLayoutEffect(() => {
		// Espera también la carga del prompt para dar prioridad a cualquier error al abrir.
		if (ocupado) return;
		const enfocarEditor = aperturaPendiente.current === filaAbierta;
		aperturaPendiente.current = null;
		if (error) avisoError.current?.focus();
		else if (enfocarEditor) tituloEditor.current?.focus();
	}, [error, filaAbierta, ocupado]);

	useEffect(() => {
		let vigente = true;
		servicio
			.cargar()
			.then((resultado) => {
				if (vigente) setDatos(resultado);
			})
			.catch(() => {
				if (vigente)
					setError(
						"No pudimos cargar los guiones y productos. Inténtalo de nuevo.",
					);
			})
			.finally(() => {
				if (vigente) setOcupado(false);
			});
		return () => {
			vigente = false;
		};
	}, [servicio]);

	useEffect(() => {
		if (!sinGuardar) return;
		const avisar = (evento: BeforeUnloadEvent) => {
			evento.preventDefault();
			evento.returnValue = "";
		};
		window.addEventListener("beforeunload", avisar);
		return () => window.removeEventListener("beforeunload", avisar);
	}, [sinGuardar]);

	async function ejecutar(accion: () => Promise<void>, exito = "") {
		if (bloqueo.current || ocupado) return false;
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
				fallo instanceof Error && !(fallo instanceof TypeError)
					? fallo.message
					: "No pudimos completar la acción. Inténtalo de nuevo.",
			);
			return false;
		} finally {
			bloqueo.current = false;
			setOcupado(false);
		}
	}
	function puedeSalir() {
		return (
			!ocupado &&
			(!sinGuardar ||
				window.confirm(
					"Tienes un guion sin guardar. Pulsa Cancelar para volver y guardarlo. ¿Salir sin guardar?",
				))
		);
	}
	function actualizarFila(fila: GuionGuardado) {
		setDatos(
			(actual) =>
				actual && {
					...actual,
					guiones: [fila, ...actual.guiones.filter((g) => g.id !== fila.id)],
				},
		);
		setTrabajo((actual) => actual && { ...actual, fila, sinGuardar: false });
	}
	const recargar = () =>
		ejecutar(async () => {
			setDatos(await servicio.cargar());
		});
	const abrir = (fila: GuionGuardado) => {
		if (!puedeSalir()) return;
		void ejecutar(async () => {
			let contenido: ReturnType<typeof leerGuionGuardado>;
			try {
				contenido = leerGuionGuardado(fila);
			} catch {
				throw new Error(
					"No pudimos abrir este guion: sus campos no son válidos.",
				);
			}
			setDatos(
				(actual) =>
					actual && {
						...actual,
						guiones: [fila, ...actual.guiones.filter((g) => g.id !== fila.id)],
					},
			);
			if (fila.id !== filaAbierta) aperturaPendiente.current = fila.id;
			setTrabajo({ ...contenido, fila, sinGuardar: false });
			setPrompt(null);
			if (fila.estado === "aprobado")
				setPrompt(
					await servicio.leerPrompt(fila.id, contenido.instruccion.duracion_s),
				);
		});
	};
	const guardar = () =>
		ejecutar(async () => {
			if (!trabajo) return;
			actualizarFila(
				await servicio.guardar(
					trabajo.instruccion,
					trabajo.productoNombre,
					trabajo.generado,
					trabajo.editado,
					trabajo.fila,
				),
			);
		}, "Guion guardado como borrador.");
	const cambiarEstado = (estado: GuionGuardado["estado"]) => {
		if (ocupado || !trabajo?.fila) return Promise.resolve(false);
		const origen = trabajo.fila.estado;
		if (
			origen === "aprobado" &&
			estado === "borrador" &&
			!window.confirm(
				"Editar este guion lo devuelve a borrador y borra su prompt de video. ¿Continuar?",
			)
		)
			return Promise.resolve(false);
		if (
			estado === "descartado" &&
			!window.confirm(
				"¿Descartar este guion? Si tiene un prompt de video, se borrará. Podrás recuperar el guion después.",
			)
		)
			return Promise.resolve(false);
		return ejecutar(async () => {
			if (!trabajo?.fila || trabajo.sinGuardar)
				throw new Error("Guarda los cambios antes de cambiar el estado.");
			actualizarFila(await servicio.cambiarEstado(trabajo.fila, estado));
			setPrompt(null);
		});
	};
	const eliminar = () => {
		if (
			!puedeSalir() ||
			!trabajo?.fila ||
			!window.confirm(
				"¿Eliminar este guion y su prompt de video? No podrás recuperarlos.",
			)
		)
			return;
		const fila = trabajo.fila;
		void ejecutar(async () => {
			await servicio.eliminar(fila);
			setDatos(
				(actual) =>
					actual && {
						...actual,
						guiones: actual.guiones.filter((g) => g.id !== fila.id),
					},
			);
			setTrabajo(null);
			setPrompt(null);
		}, "Guion eliminado.");
	};
	const generarPrompt = (herramienta: "avatar" | "escenas") =>
		ejecutar(async () => {
			if (!trabajo?.fila || trabajo.sinGuardar)
				throw new Error(
					"Guarda y aprueba el guion antes de generar el prompt.",
				);
			setPrompt(
				await servicio.generarPrompt(
					trabajo.fila,
					herramienta,
					trabajo.instruccion.duracion_s,
				),
			);
		}, "Prompt de video guardado. Puedes copiarlo para usarlo en otra herramienta.");
	const copiar = () =>
		ejecutar(async () => {
			const texto = trabajo && textoGuion(trabajo.editado);
			if (!texto) return;
			try {
				await navigator.clipboard.writeText(texto);
			} catch {
				throw new Error(
					"No pudimos copiar el texto. Selecciónalo y cópialo manualmente.",
				);
			}
		}, "Texto copiado.");
	return {
		datos,
		trabajo,
		prompt,
		ocupado,
		error,
		mensaje,
		recargar,
		abrir,
		guardar,
		cambiarEstado,
		eliminar,
		generarPrompt,
		copiar,
		puedeSalir,
		avisoError,
		tituloEditor,
		editar: (editado: Guion) =>
			setTrabajo(
				(actual) => actual && { ...actual, editado, sinGuardar: true },
			),
	};
}
