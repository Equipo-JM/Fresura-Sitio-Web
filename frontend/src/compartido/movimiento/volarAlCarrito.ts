import { gsap } from "gsap";
import { prefiereMenosMovimiento } from "./sistema";

/**
 * Una fresa sale de `origen`, vuela en arco hasta el enlace del carrito del
 * encabezado y el contador rebota al recibirla. La promesa se resuelve al
 * aterrizar. Devuelve `null`, sin animar, si hay movimiento reducido o el carrito
 * no se ve en pantalla (por ejemplo, sin diseño de página en las pruebas).
 */
export function volarAlCarrito(origen: Element): Promise<void> | null {
	const destino = document.querySelector(".carrito-enlace");
	const desde = origen.getBoundingClientRect();
	const hasta = destino?.getBoundingClientRect();
	if (prefiereMenosMovimiento() || !destino || !hasta?.width || !desde.width)
		return null;

	const fresa = document.createElement("img");
	fresa.src = "/marca/fresa-flamingo.svg";
	fresa.alt = "";
	fresa.className = "vuelo-fresa";
	fresa.setAttribute("aria-hidden", "true");
	document.body.append(fresa);
	const tamano = 48;
	const inicioX = desde.left + desde.width / 2 - tamano / 2;
	const inicioY = desde.top + desde.height / 2 - tamano / 2;
	const finX = hasta.left + hasta.width / 2 - tamano / 2;
	const finY = hasta.top + hasta.height / 2 - tamano / 2;
	const contador = destino.querySelector(".contador");

	return new Promise((resolver) => {
		gsap
			.timeline()
			.set(fresa, { x: inicioX, y: inicioY, opacity: 1 })
			.to(fresa, { x: finX, duration: 0.85, ease: "power1.inOut" }, 0)
			.to(fresa, { y: finY, duration: 0.85, ease: "back.in(0.9)" }, 0)
			.to(
				fresa,
				{ rotation: 300, scale: 0.55, duration: 0.85, ease: "power2.in" },
				0,
			)
			.call(() => {
				fresa.remove();
				resolver();
			})
			.fromTo(
				contador ?? destino,
				{ scale: 1 },
				{ scale: 1.6, duration: 0.16, ease: "power2.out" },
			)
			.to(contador ?? destino, {
				scale: 1,
				duration: 0.6,
				ease: "elastic.out(1, 0.4)",
				clearProps: "transform",
			});
	});
}
