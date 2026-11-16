import {
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

/**
 * Clave pública del widget «Fresura panel» de Turnstile. Es pública por
 * diseño: va como constante y no como variable `VITE_` (DD-05). Debe admitir
 * localhost, workers.dev y fresura.com. La secreta vive en Supabase Auth.
 */
export const CLAVE_SITIO_TURNSTILE = "0x4AAAAAAF8K87L8yoPLmx1o";

const SCRIPT =
	"https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type ApiTurnstile = {
	render: (
		contenedor: HTMLElement,
		opciones: {
			sitekey: string;
			language?: string;
			callback: (token: string) => void;
			"expired-callback": () => void;
			"error-callback": () => void;
		},
	) => string;
	reset: (id: string) => void;
	remove: (id: string) => void;
};

declare global {
	interface Window {
		turnstile?: ApiTurnstile;
	}
}

let cargando: Promise<ApiTurnstile> | undefined;

/** Carga el script oficial una sola vez, aunque haya varios formularios. */
function cargarTurnstile(): Promise<ApiTurnstile> {
	if (window.turnstile) return Promise.resolve(window.turnstile);
	cargando ??= new Promise((resolver, rechazar) => {
		const script = document.createElement("script");
		script.src = SCRIPT;
		script.async = true;
		script.onload = () =>
			window.turnstile
				? resolver(window.turnstile)
				: rechazar(new Error("Turnstile no quedó disponible"));
		script.onerror = () => {
			cargando = undefined;
			rechazar(new Error("No se pudo cargar Turnstile"));
		};
		document.head.append(script);
	});
	return cargando;
}

/**
 * Pinta el widget de Turnstile en `contenedor` con el renderizado explícito
 * oficial. Devuelve el token (o `null` mientras no lo hay) y `reiniciar`,
 * que pide uno nuevo: cada token sirve para un solo intento (DT-01, sección 2).
 */
export function useTurnstile(contenedor: RefObject<HTMLElement | null>) {
	const [token, setToken] = useState<string | null>(null);
	const [fallo, setFallo] = useState(false);
	const widget = useRef<string | null>(null);

	useEffect(() => {
		const elemento = contenedor.current;
		if (!elemento) return;
		let activo = true;
		cargarTurnstile()
			.then((api) => {
				if (!activo) return;
				widget.current = api.render(elemento, {
					sitekey: CLAVE_SITIO_TURNSTILE,
					language: "es",
					callback: (nuevo) => {
						setToken(nuevo);
						setFallo(false);
					},
					"expired-callback": () => setToken(null),
					"error-callback": () => {
						setToken(null);
						setFallo(true);
					},
				});
			})
			.catch(() => activo && setFallo(true));
		return () => {
			activo = false;
			if (widget.current) window.turnstile?.remove(widget.current);
			widget.current = null;
		};
	}, [contenedor]);

	const reiniciar = useCallback(() => {
		setToken(null);
		if (widget.current) window.turnstile?.reset(widget.current);
	}, []);

	return { token, fallo, reiniciar };
}
