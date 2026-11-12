import { beforeEach, describe, expect, it } from "vitest";
import respaldo from "../public/contenido-respaldo.json";
import {
	agregarLinea,
	cambiarCantidad,
	leerCarrito,
	quitarLinea,
	vaciarCarrito,
} from "../src/compartido/carrito/almacenCarrito";
import {
	claveLinea,
	costoSeleccion,
	distanciaKm,
	type LineaCarrito,
	mensajePedido,
	type Producto,
	pesos,
	precioLinea,
	puedeElegir,
	totalCarrito,
	validarDatos,
} from "../src/compartido/carrito/reglas";
import { esquemaContenido } from "../supabase/functions/_shared/esquemas/contenido";

const contenido = esquemaContenido.parse(respaldo);
const armada = contenido.productos.find(
	(p) => p.id === "fresitas-arma-tu-fresita",
) as Producto;
const chocolate = contenido.productos.find(
	(p) => p.id === "chocolate-fresitas",
) as Producto;

/** Línea de ejemplo para la prueba: una base, un espolvoreado y un adicional. */
function linea(extra: Partial<LineaCarrito> = {}): LineaCarrito {
	return {
		idProducto: armada.id,
		idPresentacion: "9-oz",
		seleccion: {
			base: ["arequipe"],
			espolvoreados: ["oreo"],
			adicionales: ["helado"],
		},
		cantidad: 1,
		indicaciones: "",
		...extra,
	};
}

describe("precios", () => {
	it("suma los adicionales de las opciones elegidas", () => {
		expect(costoSeleccion(armada, linea().seleccion)).toBe(3000);
		expect(costoSeleccion(armada, { base: ["nutella"] })).toBe(3000);
	});

	it("un precio ausente deja la línea por confirmar (DD-14, respaldo)", () => {
		expect(precioLinea(armada, linea())).toBeNull();
		expect(totalCarrito([linea()], contenido.productos)).toEqual({
			total: 0,
			pendiente: true,
		});
	});

	it("calcula con precio publicado: presentación, adicionales y cantidad", () => {
		const conPrecio: Producto = {
			...armada,
			presentaciones: [
				{ id: "9-oz", nombre: "9 oz", descripcion: null, precio: 14900 },
			],
		};
		expect(precioLinea(conPrecio, linea({ cantidad: 2 }))).toBe(
			(14900 + 3000) * 2,
		);
	});

	it("formatea pesos con punto de miles", () => {
		expect(pesos(14900)).toBe("$14.900");
		expect(pesos(999)).toBe("$999");
	});
});

describe("límites de opciones", () => {
	it("no deja elegir más que el máximo del grupo", () => {
		const espolvoreados = armada.grupos_opciones.find(
			(g) => g.id === "espolvoreados",
		);
		if (!espolvoreados) throw new Error("falta el grupo de espolvoreados");
		expect(espolvoreados.maximo).toBe(1);
		expect(
			puedeElegir(espolvoreados, { espolvoreados: ["oreo"] }, "milo"),
		).toBe(false);
		expect(
			puedeElegir(espolvoreados, { espolvoreados: ["oreo"] }, "oreo"),
		).toBe(true);
	});
});

describe("entrega y datos", () => {
	const datos = {
		correo: "ana@correo.com",
		telefono: "300 000 0000",
		nombre: "Ana",
		apellidos: "Ejemplo",
		direccion: "Calle de ejemplo",
		casa: "",
		barrio: "Barrio",
		ciudad: "Bogotá",
		empresa: "",
		observaciones: "",
	};

	it("pide dirección solo para domicilio", () => {
		expect(validarDatos({ ...datos, direccion: "" }, "recoger")).toEqual({});
		expect(
			validarDatos({ ...datos, direccion: "" }, "domicilio"),
		).toHaveProperty("direccion");
	});

	it("el correo es obligatorio y se revisa su forma", () => {
		expect(validarDatos({ ...datos, correo: "" }, "recoger")).toHaveProperty(
			"correo",
		);
		expect(
			validarDatos({ ...datos, correo: "ana@" }, "recoger"),
		).toHaveProperty("correo");
	});

	it("el teléfono debe tener 10 dígitos", () => {
		expect(
			validarDatos({ ...datos, telefono: "300" }, "recoger"),
		).toHaveProperty("telefono");
	});

	it("el mensaje incluye lo elegido y los datos de entrega", () => {
		const texto = mensajePedido({
			lineas: [linea({ indicaciones: "Poca crema" })],
			productos: contenido.productos,
			categorias: contenido.categorias,
			datos,
			entrega: "domicilio",
			total: 0,
			pendiente: true,
		});
		expect(texto).toContain("*Fresitas: Arma tu Fresita*, 9 oz × 1");
		expect(texto).toContain("Base: Arequipe");
		expect(texto).toContain("Indicaciones: Poca crema");
		expect(texto).toContain("*Dirección:* Calle de ejemplo");
		expect(texto).toContain("(sin productos por confirmar)");
	});

	it("al recoger, el mensaje nombra la sede del contenido", () => {
		const sede = contenido.negocio.sedes.find((s) => s.atiende_pedidos);
		const texto = mensajePedido({
			lineas: [linea()],
			productos: contenido.productos,
			categorias: contenido.categorias,
			datos,
			entrega: "recoger",
			total: 0,
			pendiente: true,
			sede,
		});
		expect(texto).toContain(
			`*Entrega:* Recoger en ${sede?.nombre} (${sede?.direccion})`,
		);
		expect(texto).not.toContain("*Dirección:*");
	});
});

describe("distancia a la sede", () => {
	it("calcula la distancia entre dos sedes de Bogotá", () => {
		const nacional = { lat: 4.6347, lng: -74.0785 };
		const javeriana = { lat: 4.6287, lng: -74.0656 };
		const km = distanciaKm(nacional, javeriana);
		expect(km).toBeGreaterThan(1);
		expect(km).toBeLessThan(2);
	});
});

describe("almacén del carrito", () => {
	beforeEach(() => {
		sessionStorage.clear();
		vaciarCarrito();
	});

	it("suma la cantidad cuando la línea ya existe", () => {
		expect(agregarLinea(linea())).toBeNull();
		expect(agregarLinea(linea({ cantidad: 2 }))).toBeNull();
		expect(leerCarrito()).toHaveLength(1);
		expect(leerCarrito()[0].cantidad).toBe(3);
	});

	it("no pasa del máximo de unidades por producto", () => {
		agregarLinea(linea({ cantidad: 9 }));
		expect(agregarLinea(linea({ cantidad: 2 }))).toMatch(/hasta 10 unidades/);
		expect(leerCarrito()[0].cantidad).toBe(9);
	});

	it("cambia cantidades y quita líneas", () => {
		agregarLinea(linea());
		cambiarCantidad(0, 3);
		expect(leerCarrito()[0].cantidad).toBe(4);
		agregarLinea(linea({ idPresentacion: "13-oz" }));
		quitarLinea(0);
		expect(leerCarrito()).toHaveLength(1);
	});

	it("guarda en sessionStorage y lee lo guardado", () => {
		agregarLinea(linea());
		const guardado = JSON.parse(
			sessionStorage.getItem("fresura-carrito") ?? "[]",
		);
		expect(guardado[0].idProducto).toBe(armada.id);
	});

	it("descarta lo guardado que no tiene la forma de una línea", () => {
		sessionStorage.setItem(
			"fresura-carrito",
			JSON.stringify([{ basura: true }]),
		);
		expect(leerCarrito()).toEqual([]);
	});

	it("claves iguales para líneas con las mismas elecciones en otro orden", () => {
		const a = linea({
			seleccion: { base: ["arequipe"], adicionales: ["helado", "hersheys"] },
		});
		const b = linea({
			seleccion: { adicionales: ["hersheys", "helado"], base: ["arequipe"] },
		});
		expect(claveLinea(a)).toBe(claveLinea(b));
	});

	it("un producto sin grupos de opciones se agrega como línea simple", () => {
		agregarLinea({
			idProducto: chocolate.id,
			idPresentacion: "9-oz",
			seleccion: {},
			cantidad: 1,
			indicaciones: "",
		});
		expect(leerCarrito()[0].idProducto).toBe(chocolate.id);
	});
});
