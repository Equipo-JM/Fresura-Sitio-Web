/** Nombres de los iconos del sitio. Son trazos propios, en una sola línea y grosor. */
export type NombreIcono =
	| "carrito"
	| "chat"
	| "menu"
	| "cerrar"
	| "abajo"
	| "izquierda"
	| "derecha"
	| "alerta"
	| "ok"
	| "ubicacion"
	| "estrella"
	| "menos"
	| "mas"
	| "paquete"
	| "atras"
	| "foto";

const TRAZOS: Record<NombreIcono, string> = {
	carrito: "M6 8h12l-1.2 12H7.2L6 8Z M9 8V6.5a3 3 0 0 1 6 0V8",
	chat: "M4 12a8 8 0 1 1 3.4 6.5L4 20l1.3-3.3A7.9 7.9 0 0 1 4 12Z",
	menu: "M4 7h16M4 12h16M4 17h16",
	cerrar: "M6 6l12 12M18 6 6 18",
	abajo: "m6 9 6 6 6-6",
	izquierda: "M19 12H5 m6-6-6 6 6 6",
	derecha: "M5 12h14 m-6-6 6 6-6 6",
	alerta: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 7.5v5.5 M12 16.4v.1",
	ok: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z m-4 9.5 2.7 2.7L16 9.5",
	ubicacion:
		"M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z M12 12.1a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z",
	estrella:
		"m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.5Z",
	menos: "M6 12h12",
	mas: "M12 6v12M6 12h12",
	paquete: "M12 3 4 7v10l8 4 8-4V7l-8-4Z M4 7l8 4 8-4 M12 11v10",
	atras: "M15 6l-6 6 6 6",
	// Marco con montaña y sol: el símbolo universal de «aquí va una foto».
	foto: "M3.5 5.5h17v13h-17Z m3.5 11 4.5-5 3 3 2-2 3 3 m-4-8a1.5 1.5 0 1 0 .01 0",
};

/**
 * Icono en línea con el trazo del sitio. Es decorativo por defecto: el texto
 * que lo acompaña dice lo mismo, así que no se anuncia a lectores de pantalla.
 */
export function Icono({
	nombre,
	className,
}: {
	nombre: NombreIcono;
	className?: string;
}) {
	return (
		<svg
			className={className ? `icono ${className}` : "icono"}
			viewBox="0 0 24 24"
			aria-hidden="true"
			focusable="false"
		>
			{/* Un solo trazo: las «m» de los trazos son relativas a donde quedó el
			    anterior (así están dibujadas las puntas de flecha y el check). */}
			<path d={TRAZOS[nombre]} />
		</svg>
	);
}
