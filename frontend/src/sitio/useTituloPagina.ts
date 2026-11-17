import { useEffect } from "react";
import { useLocation } from "react-router";

type DatosPagina = { titulo: string; descripcion: string };

/** Título de la pestaña y descripción para buscadores de cada página pública (RF-02). */
const PAGINAS: Record<string, DatosPagina> = {
	"/": {
		titulo: "Fresura, dulce pero con estilo",
		descripcion:
			"Fresas con crema y postres de Fresura en Bogotá. Arma tu pedido y envíalo por WhatsApp.",
	},
	"/menu": {
		titulo: "Menú · Fresura",
		descripcion:
			"El menú de Fresura: Fresitas, Fresotas, Fresuras y más, con tamaños, precios y toppings para armar tu pedido.",
	},
	"/promociones": {
		titulo: "Promociones · Fresura",
		descripcion:
			"Promociones vigentes de Fresura, con sus fechas, productos incluidos y condiciones.",
	},
	"/nosotros": {
		titulo: "Nosotros · Fresura",
		descripcion:
			"Conoce Fresura: postres a base de fresa con calidad, estética y cercanía. Dulce, pero con estilo.",
	},
	"/ayuda": {
		titulo: "Ayuda · Fresura",
		descripcion:
			"Preguntas frecuentes sobre los pedidos y los productos de Fresura, y cómo escribirnos.",
	},
	"/sedes": {
		titulo: "Sedes y contacto · Fresura",
		descripcion:
			"Direcciones, horarios y contacto de las sedes de Fresura en Bogotá.",
	},
	"/carrito": {
		titulo: "Carrito · Fresura",
		descripcion:
			"Revisa tu pedido de Fresura y envíalo por WhatsApp para confirmarlo.",
	},
	"/privacidad": {
		titulo: "Política de datos · Fresura",
		descripcion:
			"Cómo trata Fresura los datos que escribes para armar tu pedido por WhatsApp.",
	},
};

const PRODUCTO: DatosPagina = {
	titulo: "Ficha de producto · Fresura",
	descripcion:
		"Tamaños, precios, características y toppings de este producto de Fresura.",
};
const PERSONALIZAR: DatosPagina = {
	titulo: "Personaliza · Fresura",
	descripcion:
		"Elige el tamaño, la base y los toppings de tu producto de Fresura.",
};
const OTRA: DatosPagina = {
	titulo: "Fresura",
	descripcion: PAGINAS["/"].descripcion,
};

/** Datos de la página para una ruta; las fichas y la personalización comparten los suyos. */
export function datosDePagina(ruta: string): DatosPagina {
	if (ruta.startsWith("/producto/")) return PRODUCTO;
	if (ruta.startsWith("/personalizar/")) return PERSONALIZAR;
	return PAGINAS[ruta] ?? OTRA;
}

/** Actualiza la pestaña y la descripción al navegar, también al volver desde una ruta desconocida. */
export function useTituloPagina() {
	const { pathname } = useLocation();
	useEffect(() => {
		const { titulo, descripcion } = datosDePagina(pathname);
		document.title = titulo;
		let meta = document.querySelector<HTMLMetaElement>(
			'meta[name="description"]',
		);
		if (!meta) {
			meta = document.createElement("meta");
			meta.name = "description";
			document.head.append(meta);
		}
		meta.content = descripcion;
	}, [pathname]);
}
