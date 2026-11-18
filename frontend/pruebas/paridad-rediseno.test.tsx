import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { esquemaContenido } from "../../backend/supabase/functions/_shared/esquemas/contenido";
import respaldo from "../public/contenido-respaldo.json";
import {
	agregarLinea,
	vaciarCarrito,
} from "../src/compartido/carrito/almacenCarrito";
import { RutasDelSitio } from "../src/RutasDelSitio";
import prueba from "./datos/contenido-prueba.json";

// El proyecto no instala tipos de Node: las pruebas solo necesitan esta lectura local.
declare const process: {
	getBuiltinModule(nombre: "fs"): {
		readFileSync(ruta: string, codificacion: "utf8"): string;
	};
};
const { readFileSync } = process.getBuiltinModule("fs");

function mostrar(
	ruta = "/",
	contenido: unknown = structuredClone(prueba),
	origen = "principal",
) {
	const cliente = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	cliente.setQueryData(["contenido"], {
		contenido: esquemaContenido.parse(contenido),
		origen,
	});
	return render(
		<QueryClientProvider client={cliente}>
			<MemoryRouter initialEntries={[ruta]}>
				<RutasDelSitio />
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	vaciarCarrito();
	if (!HTMLDialogElement.prototype.showModal) {
		HTMLDialogElement.prototype.showModal = function () {
			this.setAttribute("open", "");
		};
		HTMLDialogElement.prototype.close = function () {
			this.removeAttribute("open");
		};
	}
});

describe("paridad del inicio", () => {
	it("marca las referencias arriba y una sola vez, sin segunda foto de chocolate", () => {
		const inicio = mostrar();
		expect(screen.queryAllByText("Foto de ejemplo")).toHaveLength(0);
		for (const foto of document.querySelectorAll(".polaroid-foto:has(> img)")) {
			expect(foto.querySelectorAll(".pv-foto")).toHaveLength(1);
		}
		inicio.unmount();
		const menu = mostrar("/menu");
		for (const tarjeta of document.querySelectorAll(".tarjeta")) {
			expect(tarjeta.querySelectorAll(".pv-foto")).toHaveLength(1);
		}
		const chocolate = screen.getByRole("region", {
			name: "Fresas con chocolate",
		});
		expect(chocolate.querySelectorAll(".cara.b")).toHaveLength(0);
		menu.unmount();
		mostrar("/nosotros");
		expect(document.querySelector(".nosotros-foto img")).toHaveAttribute(
			"src",
			"/ejemplos/nosotros-interior.webp",
		);
		expect(document.querySelector(".nosotros-foto img")).toHaveAttribute(
			"height",
			"900",
		);
		expect(document.querySelector(".nosotros-foto img")).toHaveAttribute(
			"srcset",
			expect.stringContaining("nosotros-interior-400.webp 400w"),
		);
	});
	it.each(["/sedes"])(
		"presenta Horario y el pie sin prefijos de sede en %s",
		(ruta) => {
			mostrar(ruta);
			expect(screen.getAllByRole("table", { name: "Horario" })).toHaveLength(2);
			const pie = screen.getByRole("contentinfo");
			expect(within(pie).getByText("Número por definir")).toBeInTheDocument();
			expect(pie).toHaveTextContent("U Nacional:");
			expect(pie).toHaveTextContent("U Javeriana:");
			expect(pie).not.toHaveTextContent("Sede U");
		},
	);
	it("la foto de portada entra desde una escala mayor como en el prototipo", () => {
		mostrar();
		const foto = document.querySelector(".portada-arco img");
		if (!foto) throw new Error("Falta la foto de portada");
		expect(Number(gsap.getProperty(foto, "scaleX"))).toBeGreaterThan(1);
	});
	it("liga el sello y Nosotros al desplazamiento y limpia al salir", () => {
		const inicio = mostrar();
		expect(ScrollTrigger.getAll().map((t) => t.trigger)).toEqual([
			document.querySelector(".portada"),
		]);
		inicio.unmount();
		expect(ScrollTrigger.getAll()).toHaveLength(0);
		const nosotros = mostrar("/nosotros");
		expect(ScrollTrigger.getAll().map((t) => t.trigger)).toEqual([
			document.querySelector("#nosotros"),
		]);
		nosotros.unmount();
		expect(ScrollTrigger.getAll()).toHaveLength(0);
	});
	it("ofrece Promociones en la navegación, con página propia", () => {
		mostrar();
		const nav = within(screen.getByRole("navigation", { name: "Principal" }));
		expect(nav.getAllByRole("link").map((a) => a.textContent)).toEqual(
			expect.arrayContaining(["Promociones"]),
		);
		expect(nav.getByRole("link", { name: "Promociones" })).toHaveAttribute(
			"href",
			"/promociones",
		);
	});
	it("despliega las categorías desde Menú", () => {
		mostrar();
		const boton = screen.getByRole("button", { name: "Menú" });
		fireEvent.click(boton);
		expect(boton).toHaveAttribute("aria-expanded", "true");
		expect(
			within(screen.getByRole("navigation", { name: "Principal" })).getByRole(
				"link",
				{ name: "Fresitas" },
			),
		).toHaveAttribute("href", "/menu#cat-fresitas");
	});
	it("Escape cierra las categorías y devuelve el foco a Menú", () => {
		mostrar();
		const boton = screen.getByRole("button", { name: "Menú" });
		fireEvent.click(boton);
		fireEvent.keyDown(screen.getByRole("link", { name: "Fresitas" }), {
			key: "Escape",
		});
		expect(boton).toHaveAttribute("aria-expanded", "false");
		expect(boton).toHaveFocus();
	});
	it("cierra el desplegable al tocar fuera y la navegación móvil con Escape", () => {
		mostrar();
		const menu = screen.getByRole("button", { name: "Menú" });
		fireEvent.click(menu);
		fireEvent.click(screen.getByRole("main"));
		expect(menu).toHaveAttribute("aria-expanded", "false");
		fireEvent.click(screen.getByRole("button", { name: "Abrir navegación" }));
		fireEvent.keyDown(document, { key: "Escape" });
		expect(
			screen.getByRole("button", { name: "Abrir navegación" }),
		).toHaveFocus();
	});
	it.each([prueba, respaldo])(
		"lee la presentación del contenido con el énfasis del rediseño",
		(contenido) => {
			mostrar("/", contenido);
			const titulo = screen.getByRole("heading", {
				level: 1,
				name: "Ven, date un gusto bonito… como tú",
			});
			expect(titulo.querySelector("em")).toHaveTextContent("como tú");
			expect(
				screen.getByText(
					"Fresas con crema a tu manera: eliges el tamaño, le pones tu toque y terminamos el pedido por WhatsApp.",
				),
			).toBeInTheDocument();
			expect(
				screen.getByText(/U Nacional y U Javeriana/, {
					selector: ".portada-dato span",
				}),
			).toBeInTheDocument();
		},
	);
	it("no repite la pregunta de la portada en antojos", () => {
		mostrar();
		expect(screen.getAllByText("¿No sabes qué pedir?")).toHaveLength(1);
	});
	it("ofrece el menú cuando no hay promociones", () => {
		const contenido = structuredClone(prueba);
		contenido.promociones = [];
		mostrar("/promociones", contenido);
		const bloque = screen.getByRole("region", { name: "Promociones" });
		expect(
			within(bloque).getByText("Por ahora no tenemos promociones publicadas"),
		).toBeInTheDocument();
		expect(
			within(bloque).getByRole("link", { name: "Ver el menú" }),
		).toHaveAttribute("href", "/menu");
	});
	it("muestra vigencia, productos y condiciones sin aplicar descuentos", () => {
		const contenido = structuredClone(prueba);
		contenido.promociones = [
			{
				id: "martes",
				titulo: "Martes de fresas",
				productos: ["fresitas-caribena"],
				vigencia: { desde: "2000-11-01", hasta: "2999-11-30" },
				condiciones: "Solo en U Nacional",
			},
		];
		mostrar("/promociones", contenido);
		const bloque = within(screen.getByRole("region", { name: "Promociones" }));
		expect(bloque.getByText(/2000-11-01.*2999-11-30/)).toBeInTheDocument();
		expect(bloque.getByText(/Fresitas: Caribeña/)).toBeInTheDocument();
		expect(bloque.getByText(/Solo en U Nacional/)).toBeInTheDocument();
	});
	it.each([
		["Fresitas", "9 oz · Incluye 1 base, 1 espolvoreado, 1 salsa y 1 topping"],
		[
			"Fresotas",
			"13 oz · Incluye 1 base, 2 espolvoreados, 2 salsas y 2 toppings",
		],
		[
			"Fresuras",
			"16 oz · Incluye 1 base, 2 espolvoreados, 2 salsas, 2 toppings y helado",
		],
		["Fresas con chocolate", "9, 12 y 16 oz"],
		["Miti Miti", "Fresitas, Fresotas y Fresuras"],
		["Para compartir", "Ensalada de frutas, Merengón y Fresubowl"],
	])("presenta el dato completo de %s", (nombre, dato) => {
		mostrar("/menu");
		expect(
			within(screen.getByRole("region", { name: nombre })).getByText(dato, {
				exact: false,
			}),
		).toBeInTheDocument();
	});
	it("identifica la posición de los carruseles", () => {
		mostrar("/menu");
		const categoria = within(screen.getByRole("region", { name: "Fresitas" }));
		expect(categoria.getByText("1 de 5")).toBeInTheDocument();
		expect(
			categoria.getByRole("button", { name: "Siguiente" }),
		).toBeInTheDocument();
	});
	it("el carrusel recorre páginas con flechas y teclado y anuncia los extremos", () => {
		mostrar("/menu");
		const categoria = screen.getByRole("region", { name: "Fresitas" });
		const carril = within(categoria).getByRole("list", {
			name: /Productos, usa/,
		});
		Object.defineProperties(carril, {
			clientWidth: { value: 300 },
			scrollWidth: { value: 1500 },
		});
		Object.defineProperty(carril.children[1], "offsetLeft", { value: 300 });
		carril.scrollTo = function (opciones) {
			this.scrollLeft = typeof opciones === "object" ? (opciones.left ?? 0) : 0;
			fireEvent.scroll(this);
		};
		fireEvent.scroll(carril);
		expect(
			within(categoria).getByRole("button", { name: "Anterior" }),
		).toHaveAttribute("aria-disabled", "true");
		fireEvent.click(
			within(categoria).getByRole("button", { name: "Siguiente" }),
		);
		expect(within(categoria).getByText("2 de 5")).toBeInTheDocument();
		fireEvent.keyDown(carril, { key: "ArrowLeft" });
		expect(within(categoria).getByText("1 de 5")).toBeInTheDocument();
	});
	it("mantiene la foto publicada y las caras de referencia de DD-43", () => {
		const contenido = structuredClone(prueba);
		contenido.productos[1].imagen.ruta =
			"https://fotos.example.com/caribena.webp";
		// Un id sin foto de Rappi deja a Fresuras Top con las caras de DD-43.
		contenido.productos[12].id = "fresuras-sin-foto";
		mostrar("/menu", contenido);
		const tarjeta = screen.getByRole("link", {
			name: /Fresitas: Caribeña, Desde/,
		});
		expect(within(tarjeta).getAllByRole("img")[0]).toHaveAttribute(
			"src",
			"https://fotos.example.com/caribena.webp",
		);
		const pendiente = screen.getByRole("link", {
			name: /Fresuras: Top, Desde/,
		});
		expect(within(pendiente).getByText("Foto por validar")).toBeInTheDocument();
		expect(
			within(pendiente).getByText("Segunda foto por validar"),
		).toBeInTheDocument();
	});
	it("ordena las categorías del menú e incluye Nosotros y sus valores", () => {
		const menu = mostrar("/menu");
		expect(
			screen
				.getAllByRole("region")
				.map((r) => r.getAttribute("aria-labelledby")),
		).toEqual([
			"titulo-antojos",
			"titulo-fresitas",
			"titulo-fresotas",
			"titulo-fresuras",
			"titulo-chocolate",
			"titulo-miti",
			"titulo-compartir",
		]);
		menu.unmount();
		mostrar("/nosotros");
		for (const valor of ["Calidad", "Estética", "Cercanía"])
			expect(screen.getByRole("heading", { name: valor })).toBeInTheDocument();
	});
	it("distingue la publicación pendiente y enlaza las otras redes", () => {
		mostrar();
		const reciente = within(
			screen.getByRole("region", { name: /Lo más reciente/ }),
		);
		expect(reciente.getByText("Publicación por validar")).toBeInTheDocument();
		expect(reciente.getByText(/También estamos en/)).toHaveTextContent(
			"También estamos en TikTok y Facebook.",
		);
	});
	it("muestra el espacio del logo de Google en Nosotros", () => {
		mostrar("/nosotros");
		expect(
			screen.getByText("Espacio para el logo de Google"),
		).toBeInTheDocument();
	});
	it("presenta el mapa como enlace y separa el cierre por almuerzo", () => {
		mostrar("/sedes");
		expect(screen.getAllByText("Ubicación en Google Maps")).toHaveLength(2);
		expect(
			screen.getByRole("rowheader", { name: "Cierre por almuerzo" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /Cómo llegar a la sede U Nacional/ }),
		).toHaveAttribute(
			"href",
			expect.stringContaining("google.com/maps/search/"),
		);
	});
});

describe("paridad de ficha y personalización", () => {
	it("vuelve con la flecha de texto y separa los sellos de los títulos", () => {
		mostrar("/producto/fresitas-caribena");
		expect(
			screen.getByRole("link", { name: "← Volver al menú" }),
		).toBeInTheDocument();
		for (const nombre of ["Descripción", "Tamaños", "Toppings"]) {
			const titulo = screen.getByRole("heading", { name: nombre });
			expect(titulo.querySelector(".por-validar")).toBeNull();
			expect(titulo.parentElement).toHaveTextContent("Por validar");
		}
	});
	it("en personalización la referencia tiene solo el sello Propuesta", () => {
		mostrar("/personalizar/chocolate-fresitas");
		const visual = document.querySelector(".visual");
		expect(visual).toHaveTextContent("Propuesta");
		expect(visual).not.toHaveTextContent("Por validar");
		expect(
			screen.queryByRole("list", { name: "Lo que llevas" }),
		).not.toBeInTheDocument();
	});
	it("la consulta por WhatsApp identifica categoría y producto", () => {
		mostrar("/producto/fresitas-caribena");
		expect(
			decodeURIComponent(
				screen
					.getByRole("link", { name: "Preguntar por WhatsApp" })
					.getAttribute("href") ?? "",
			),
		).toContain("Hola, Fresura. Quiero preguntar por Fresitas: Caribeña.");
	});
	it("distingue un precio por confirmar del modo respaldo", () => {
		const contenido = structuredClone(prueba);
		const producto = contenido.productos.find(
			(p) => p.id === "compartir-merengon",
		);
		if (!producto) throw new Error("Falta Merengón en los datos de prueba");
		mostrar("/producto/compartir-merengon", {
			...contenido,
			productos: contenido.productos.map((p) =>
				p.id === producto.id
					? {
							...p,
							presentaciones: p.presentaciones.map((t) => ({
								...t,
								precio: null,
							})),
						}
					: p,
			),
		});
		expect(document.querySelector(".ficha-precio")).toHaveTextContent(
			"Precio por confirmar",
		);
		expect(
			screen.getByRole("link", { name: "Elegir y agregar al carrito" }),
		).toBeInTheDocument();
		fireEvent.click(
			screen.getByRole("link", { name: "Elegir y agregar al carrito" }),
		);
		expect(document.querySelector(".precio-barra")).toHaveTextContent(
			"Precio por confirmar",
		);
	});
	it("muestra la foto y la bajada sin inclusiones en un producto sin opciones", () => {
		mostrar("/personalizar/chocolate-fresitas");
		expect(
			screen.getByRole("heading", {
				level: 1,
				name: "Fresas con chocolate: Fresitas",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByText(/9 oz\. Elige la cantidad y déjanos tus indicaciones\./),
		).toBeInTheDocument();
		expect(
			screen.getByRole("img", { name: "Fresitas, foto provisional" }),
		).toHaveAttribute("src", "/ejemplos/productos/fresitas-con-chocolate.webp");
		expect(
			screen.queryByRole("heading", { name: "Base" }),
		).not.toBeInTheDocument();
	});
	it("usa categoría, Desde, características y toppings en la ficha", () => {
		mostrar("/producto/fresitas-caribena");
		expect(
			screen.getByRole("heading", { level: 1, name: "Fresitas: Caribeña" }),
		).toBeInTheDocument();
		expect(screen.getByText("Desde $14.900")).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Características" }),
		).toBeInTheDocument();
		expect(
			screen.getByText("Disponible en las sedes U Nacional y U Javeriana"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Descripción" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Toppings" }),
		).toBeInTheDocument();
		expect(screen.getByText("Bubols")).toBeInTheDocument();
	});
	it("ordena Descripción, Características, Tamaños y Toppings en la ficha", () => {
		mostrar("/producto/fresitas-caribena");
		expect(
			within(screen.getByRole("main"))
				.getAllByRole("heading", { level: 2 })
				.map((h) => h.textContent?.trim()),
		).toEqual(["Descripción", "Características", "Tamaños", "Toppings"]);
	});
	it.each(prueba.productos.map((p) => [p.id, p.grupos_opciones.length > 0]))(
		"lee la descripción y las características del contenido de %s",
		(id, personalizable) => {
			mostrar(`/producto/${id}`);
			expect(
				screen.getByText(
					personalizable
						? "Elige tus opciones y déjanos tus indicaciones."
						: "Déjanos tus indicaciones al hacer tu pedido.",
				),
			).toBeInTheDocument();
			expect(
				screen.getByText("Disponible en las sedes U Nacional y U Javeriana"),
			).toBeInTheDocument();
		},
	);
	it("guía el inicio de la personalización y muestra límites y costos", () => {
		mostrar("/personalizar/fresitas-caribena");
		expect(screen.getByText("Empieza por la base")).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { level: 1, name: "Fresitas: Caribeña" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				/Ponle tu toque único: 9 oz con 1 base, 1 espolvoreado, 1 salsa y 1 topping\./,
			),
		).toBeInTheDocument();
		expect(screen.getByText("0 elegidos")).toBeInTheDocument();
		expect(screen.getByText("Opcional. $3.000 cada uno.")).toBeInTheDocument();
		expect(
			screen.getByText(/Elige hasta 1 \(opcional\)\. Las mermeladas como base/),
		).toBeInTheDocument();
	});
	it("ofrece WhatsApp con el producto en el mensaje (RF-08)", () => {
		mostrar("/personalizar/fresitas-caribena");
		const enlace = screen.getByRole("link", {
			name: "¿Tienes dudas? Pregúntanos por WhatsApp",
		});
		expect(enlace.getAttribute("href")).toMatch(
			/^https:\/\/wa\.me\/\d+\?text=/,
		);
		expect(decodeURIComponent(enlace.getAttribute("href") ?? "")).toContain(
			"Fresitas: Caribeña",
		);
	});
	it("confirma en un diálogo con tres acciones y permite seguir personalizando", () => {
		mostrar("/personalizar/fresitas-caribena");
		fireEvent.click(screen.getByRole("button", { name: "Agregar al carrito" }));
		const dialogo = screen.getByRole("dialog", {
			name: "Ya está en tu carrito",
		});
		expect(within(dialogo).getByText("¡A tu carrito!")).toBeInTheDocument();
		expect(
			within(dialogo).getByText("Fresitas: Caribeña, 9 oz × 1"),
		).toBeInTheDocument();
		expect(
			within(dialogo).getByRole("link", { name: "Seguir comprando" }),
		).toHaveAttribute("href", "/menu");
		expect(
			within(dialogo).getByRole("link", { name: "Ver carrito" }),
		).toHaveAttribute("href", "/carrito");
		fireEvent.click(
			within(dialogo).getByRole("button", { name: "Seguir personalizando" }),
		);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});
});

describe("otras vistas", () => {
	it("presenta el título del inicio incluso antes de cargar React", () => {
		const pagina = new DOMParser().parseFromString(
			readFileSync("frontend/index.html", "utf8"),
			"text/html",
		);
		expect(pagina.title).toBe("Fresura, dulce pero con estilo");
	});
	it("conserva las unidades del resumen y los textos de entrega sin un sello extra", () => {
		agregarLinea({
			idProducto: "fresitas-caribena",
			idPresentacion: "9-oz",
			seleccion: {},
			cantidad: 1,
			indicaciones: "",
		});
		mostrar("/carrito");
		expect(document.querySelector(".insignia")).toHaveTextContent("1 unidades");
		fireEvent.click(
			screen.getByRole("button", { name: "Continuar a la entrega" }),
		);
		const domicilio = screen.getByRole("radio", { name: "Domicilio" });
		expect(domicilio).toBeInTheDocument();
		const recoger = screen.getByRole("radio", {
			name: /Recoger en sede U Nacional/,
		});
		expect(recoger.parentElement?.querySelector("span")).toHaveTextContent(
			"12:00 m. a 8:00 p. m.",
		);
		const guardar = screen.getByRole("checkbox", {
			name: "Guardar mi información y consultar más rápidamente la próxima vez",
		});
		expect(guardar).toBeDisabled();
		expect(guardar).not.toBeChecked();
		expect(
			screen.queryByRole("checkbox", { name: /novedades/ }),
		).not.toBeInTheDocument();
		expect(
			screen
				.getByRole("combobox", { name: "País / región" })
				.parentElement?.querySelector("svg"),
		).not.toBeNull();
		expect(
			screen
				.getByRole("button", { name: "Volver a Tu pedido" })
				.querySelector("path"),
		).toHaveAttribute("d", "m5 12.5 4.5 4.5L19 7.5");
	});
	it("el respaldo conserva el menú sin precios de productos, adicionales ni promociones", () => {
		const contenido = esquemaContenido.parse(respaldo);
		expect(contenido.promociones).toHaveLength(0);
		for (const producto of contenido.productos) {
			for (const talla of producto.presentaciones)
				expect(talla.precio).toBeNull();
			for (const grupo of producto.grupos_opciones)
				for (const opcion of grupo.opciones) expect(opcion.adicional).toBe(0);
		}
		const menu = (contenido: unknown) =>
			JSON.stringify(contenido, (clave, valor) =>
				clave === "precio" || clave === "adicional" ? null : valor,
			);
		expect(menu(respaldo.productos)).toBe(menu(prueba.productos));
	});
	it.each(["/producto/no-existe", "/personalizar/no-existe"])(
		"muestra la página no encontrada para %s",
		(ruta) => {
			mostrar(ruta);
			expect(
				screen.getByRole("heading", { name: "No encontramos esta página" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("link", { name: "Volver al inicio" }),
			).toHaveAttribute("href", "/");
		},
	);
	it("al revisar con datos vacíos enfoca el primer campo y cuenta los errores", () => {
		agregarLinea({
			idProducto: "fresitas-caribena",
			idPresentacion: "9-oz",
			seleccion: {},
			cantidad: 1,
			indicaciones: "",
		});
		mostrar("/carrito");
		fireEvent.click(
			screen.getByRole("button", { name: "Continuar a la entrega" }),
		);
		fireEvent.click(
			screen.getAllByRole("button", { name: "Revisar pedido" })[0],
		);
		expect(screen.getByLabelText(/Correo electrónico/)).toHaveFocus();
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Hay 5 datos por completar o corregir. Revisa los campos marcados.",
		);
	});
	it.each(["/carrito", "/personalizar/fresitas-caribena"])(
		"en respaldo desactiva %s conservando el carrito",
		(ruta) => {
			agregarLinea({
				idProducto: "fresitas-caribena",
				idPresentacion: "9-oz",
				seleccion: {},
				cantidad: 1,
				indicaciones: "",
			});
			mostrar(ruta, respaldo, "respaldo");
			expect(
				screen.getByRole("heading", {
					name: "El carrito no está disponible por ahora",
				}),
			).toBeInTheDocument();
			expect(
				within(screen.getByRole("main")).getByRole("link", {
					name: "Escríbenos",
				}),
			).toHaveAttribute("href", expect.stringContaining("https://wa.me/"));
			expect(sessionStorage.getItem("fresura-carrito")).toContain(
				"fresitas-caribena",
			);
		},
	);
	it("la ficha de respaldo oculta precios y ofrece consultarlos por WhatsApp", () => {
		mostrar("/producto/fresitas-caribena", respaldo, "respaldo");
		expect(
			screen.queryByRole("table", { name: "Tamaños y precios" }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("link", { name: "Elegir y agregar al carrito" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Consulta precios por WhatsApp" }),
		).toHaveAttribute("href", expect.stringContaining("https://wa.me/"));
	});
	it("muestra Toppings: ninguno también en un producto sin grupos", () => {
		agregarLinea({
			idProducto: "chocolate-fresitas",
			idPresentacion: "9-oz",
			seleccion: {},
			cantidad: 1,
			indicaciones: "",
		});
		mostrar("/carrito");
		expect(screen.getByText("Toppings: ninguno")).toBeInTheDocument();
	});
	it("ordena Contacto, Entrega, Métodos de envío y Pago con teléfono dentro de Entrega", () => {
		agregarLinea({
			idProducto: "fresitas-caribena",
			idPresentacion: "9-oz",
			seleccion: {},
			cantidad: 1,
			indicaciones: "",
		});
		mostrar("/carrito");
		fireEvent.click(
			screen.getByRole("button", { name: "Continuar a la entrega" }),
		);
		fireEvent.click(screen.getByRole("radio", { name: /Domicilio/ }));
		expect(
			screen.getByRole("heading", { name: "Métodos de envío" }),
		).toBeInTheDocument();
		const entrega = screen.getByRole("region", { name: "Entrega" });
		expect(
			within(entrega).getByRole("textbox", { name: /Teléfono/ }),
		).toBeInTheDocument();
		expect(
			screen.getByLabelText(
				"Guardar mi información y consultar más rápidamente la próxima vez",
				{ exact: false },
			),
		).toBeDisabled();
	});
	it("muestra el precio y el tamaño en el resumen plegable", () => {
		agregarLinea({
			idProducto: "fresitas-caribena",
			idPresentacion: "9-oz",
			seleccion: {},
			cantidad: 2,
			indicaciones: "",
		});
		mostrar("/carrito");
		const boton = screen.getByRole("button", { name: /Resumen del pedido/ });
		fireEvent.click(boton);
		expect(boton).toHaveAttribute("aria-expanded", "true");
		const resumen = screen.getByRole("complementary", {
			name: "Resumen del pedido",
		});
		expect(within(resumen).getByText("9 oz")).toBeInTheDocument();
		expect(resumen.querySelector(".item strong")).toHaveTextContent("$29.800");
	});
	it("muestra el mensaje de recogida sin dirección, sin copia y con envío directo", () => {
		agregarLinea({
			idProducto: "fresitas-caribena",
			idPresentacion: "9-oz",
			seleccion: {},
			cantidad: 1,
			indicaciones: "Sin hielo",
		});
		mostrar("/carrito");
		fireEvent.click(
			screen.getByRole("button", { name: "Continuar a la entrega" }),
		);
		for (const [etiqueta, valor] of [
			[/Correo electrónico/, "ana@example.com"],
			[/^Nombre/, "Ana"],
			[/Apellidos/, "Ruiz"],
			[/Teléfono/, "3001234567"],
		] as const)
			fireEvent.change(screen.getByLabelText(etiqueta), {
				target: { value: valor },
			});
		fireEvent.click(screen.getByRole("radio", { name: /Recoger en/ }));
		fireEvent.click(
			screen.getAllByRole("button", { name: "Revisar pedido" })[0],
		);
		expect(document.querySelector(".burbuja strong")).toHaveTextContent(
			"Fresitas: Caribeña",
		);
		expect(
			screen.queryByRole("button", { name: "Copiar mensaje" }),
		).not.toBeInTheDocument();
		expect(document.querySelector(".burbuja")).toHaveTextContent(
			"Entrega: Recoger en sede U Nacional",
		);
		expect(document.querySelector(".burbuja")).not.toHaveTextContent(
			"Calle 45",
		);
		expect(
			screen.getByRole("link", { name: "Enviar por WhatsApp" }),
		).toHaveAttribute("href", expect.stringContaining("https://wa.me/"));
	});
	it("oculta promociones y compra con el respaldo, conservando el menú", () => {
		mostrar("/menu", respaldo, "respaldo");
		expect(
			within(screen.getByRole("navigation", { name: "Principal" })).queryByRole(
				"link",
				{ name: "Promociones" },
			),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /Carrito desactivado/ }),
		).toHaveAttribute("aria-disabled", "true");
		expect(
			screen.getByRole("region", { name: "Fresitas" }),
		).toBeInTheDocument();
	});
	it("deja el carrito vacío sin pasos y con la fresa decorativa", () => {
		mostrar("/carrito");
		expect(
			screen.queryByRole("navigation", { name: "Pasos del pedido" }),
		).not.toBeInTheDocument();
		expect(document.querySelector(".vacio-caja img")).toHaveAttribute(
			"src",
			"/marca/fresa-flamingo.svg",
		);
	});
	it("presenta la política breve con el aviso del rediseño", () => {
		mostrar("/privacidad");
		expect(
			screen.getByRole("heading", { level: 1, name: "Política de datos" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"No creamos cuentas de clientes ni pedimos datos sensibles.",
			),
		).toBeInTheDocument();
	});
	it("muestra Toppings: ninguno y el total sin promociones en el carrito", () => {
		agregarLinea({
			idProducto: "fresitas-caribena",
			idPresentacion: "9-oz",
			seleccion: {},
			cantidad: 1,
			indicaciones: "",
		});
		mostrar("/carrito");
		expect(screen.getByText("Toppings: ninguno")).toBeInTheDocument();
		expect(
			screen.getByText(/El total estimado no incluye promociones ni domicilio/),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Continuar" }),
		).toBeInTheDocument();
	});
	it("ofrece sedes y contacto en su página", () => {
		mostrar("/sedes");
		expect(
			screen.getByRole("heading", { level: 1, name: "Sedes y contacto" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Escríbenos por WhatsApp" }),
		).toHaveAttribute("href", expect.stringContaining("https://wa.me/"));
	});
	it.each([
		["/", "Fresura, dulce pero con estilo"],
		["/producto/fresitas-caribena", "Ficha de producto · Fresura"],
		["/personalizar/fresitas-caribena", "Personaliza · Fresura"],
		["/carrito", "Carrito · Fresura"],
		["/sedes", "Sedes y contacto · Fresura"],
		["/privacidad", "Política de datos · Fresura"],
		["/no-existe", "Fresura"],
	])("actualiza el título de pestaña para %s", (ruta, titulo) => {
		mostrar(ruta);
		expect(document.title).toBe(titulo);
	});
});

describe("estilos de paridad sin medición de geometría", () => {
	let estilos: HTMLStyleElement;
	beforeEach(() => {
		estilos = document.createElement("style");
		estilos.textContent = ["tokens", "base", "componentes"]
			.map((nombre) =>
				readFileSync(`frontend/src/compartido/estilos/${nombre}.css`, "utf8"),
			)
			.join("\n");
		document.head.append(estilos);
	});
	afterEach(() => estilos.remove());
	it("sitúa las etiquetas de referencia arriba, sobre el marco", () => {
		mostrar();
		const etiqueta = document.querySelector(".portada-foto .pv-foto");
		if (!etiqueta) throw new Error("Falta la etiqueta de portada");
		expect(etiqueta.parentElement).toHaveClass("portada-foto");
		expect(getComputedStyle(etiqueta).top).toBe("10px");
		expect(getComputedStyle(etiqueta).bottom).toBe("auto");
	});
	it("conserva el marco de la ficha sin recortar el borde beige", () => {
		mostrar("/producto/fresitas-caribena");
		const foto = document.querySelector(".ficha-foto");
		if (!foto) throw new Error("Falta la foto de ficha");
		expect(getComputedStyle(foto).overflow).not.toBe("hidden");
		expect(getComputedStyle(foto).aspectRatio).toBe("auto");
		expect(foto.querySelector(".tarjeta-foto")).toBeInTheDocument();
	});
	it("usa fondos planos en las fotos pendientes y el encuadre de portada", () => {
		const inicio = mostrar();
		const portada = document.querySelector(".portada-arco img");
		if (!portada) throw new Error("Falta la foto de portada");
		expect(getComputedStyle(portada).objectPosition).toBe("45% 72%");
		inicio.unmount();
		// Todos tienen foto de Rappi; un id sin ella muestra el espacio pendiente.
		const contenido = structuredClone(prueba);
		contenido.productos[12].id = "fresuras-sin-foto";
		mostrar("/menu", contenido);
		const pendiente = document.querySelector(".tarjeta .foto-pendiente");
		if (!pendiente) throw new Error("Falta una foto pendiente del menú");
		expect(getComputedStyle(pendiente).backgroundImage).toBe("none");
		expect(getComputedStyle(pendiente).gap).toBe("12px");
	});
	it("conserva los espacios y tamaños del formulario y del carrito", () => {
		agregarLinea({
			idProducto: "fresitas-caribena",
			idPresentacion: "9-oz",
			seleccion: {},
			cantidad: 1,
			indicaciones: "",
		});
		mostrar("/carrito");
		const titulo = document.querySelector(".linea-titulo");
		if (!titulo) throw new Error("Falta el producto del carrito");
		expect(getComputedStyle(titulo).fontSize).toBe("22px");
		fireEvent.click(
			screen.getByRole("button", { name: "Continuar a la entrega" }),
		);
		expect(
			getComputedStyle(document.querySelector(".form") as Element).gap,
		).toBe("28px");
		expect(
			getComputedStyle(document.querySelector(".contador-c") as Element)
				.fontSize,
		).toBe("var(--texto-chico)");
	});
	it("mantiene el tamaño de los títulos de sedes y las redes sin píldoras", () => {
		mostrar("/sedes");
		expect(
			getComputedStyle(
				screen.getByRole("heading", { name: "Sedes y contacto" }),
			).fontSize,
		).toBe("52.48px");
		expect(
			getComputedStyle(document.querySelector("#titulo-contacto") as Element)
				.fontSize,
		).toBe("30px");
		const red = document.querySelector(".contacto-sedes .chips li");
		if (!red) throw new Error("Faltan las redes");
		expect(getComputedStyle(red).padding).toBe("0px");
	});
	it("evita estirar la página no encontrada antes del pie", () => {
		const { container } = mostrar("/no-existe");
		container.id = "raiz";
		expect(getComputedStyle(container).display).toBe("block");
		expect(document.querySelector(".vacio > p")).toBeNull();
	});
	it("conserva las medidas y el sello del diálogo del prototipo", () => {
		mostrar("/personalizar/fresitas-caribena");
		fireEvent.click(screen.getByRole("button", { name: "Agregar al carrito" }));
		const dialogo = screen.getByRole("dialog");
		expect(getComputedStyle(dialogo).width).toBe("100%");
		expect(getComputedStyle(dialogo).borderRadius).toBe("28px 28px 0 0");
		const sello = dialogo.querySelector(".sello-hoja");
		if (!sello) throw new Error("Falta el sello del diálogo");
		expect(getComputedStyle(sello).width).toBe("150px");
		expect(getComputedStyle(sello).height).toBe("150px");
		expect(getComputedStyle(sello).transform).toBe("rotate(-10deg)");
	});
});
