import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type RefObject, useLayoutEffect } from "react";
import { MOVIMIENTO } from "./sistema";

/**
 * Coreografía de la portada en una línea de tiempo: el logotipo aparece
 * enfocándose, sube la frase, el vaso crece desde abajo y las piezas salen
 * disparadas desde él, girando, hasta su lugar. Al final entran el viento, los
 * botones y el dato de sedes. Después el vaso flota y cada pieza se mece en la
 * dirección del viento con su propio ritmo; esos bucles se pausan cuando la
 * portada sale de la pantalla. En pantallas anchas, las piezas grandes de los
 * costados entran desde fuera y siguen al puntero y al desplazamiento con más
 * recorrido que la escena central, para dar profundidad.
 *
 * Corre en `useLayoutEffect` para fijar el estado inicial antes de pintar. Con
 * movimiento reducido no crea nada: la portada queda quieta en su estado final.
 */
export function useEntradaPortada(portada: RefObject<HTMLElement | null>) {
	useLayoutEffect(() => {
		const raiz = portada.current;
		if (!raiz) return;

		const medios = gsap.matchMedia(raiz);
		medios.add(
			{
				reducir: "(prefers-reduced-motion: reduce)",
				escritorio: "(min-width: 900px)",
			},
			(contexto) => {
				const { reducir, escritorio } = contexto.conditions as {
					reducir?: boolean;
					escritorio?: boolean;
				};
				if (reducir) return;

				// Las piezas ocultas en móvil miden cero y no se animan.
				const piezas = gsap.utils
					.toArray<HTMLElement>(".portada-pieza", raiz)
					.filter((pieza) => pieza.offsetWidth > 0);
				const vaso = raiz.querySelector<HTMLElement>(".portada-vaso");
				const escala = escritorio ? 1 : 0.6;

				const linea = gsap.timeline({
					defaults: { ease: MOVIMIENTO.curva.entrada },
				});
				linea
					.from(
						".portada-logo",
						{ opacity: 0, scale: 0.92, filter: "blur(6px)", duration: 1.1 },
						0,
					)
					.from(".portada-frase", { opacity: 0, y: 18, duration: 0.9 }, 0.15)
					.from(
						".portada-vaso",
						{ opacity: 0, y: 30, scale: 0.86, duration: 1.2 },
						0.35,
					)
					.from(".portada-viento", { opacity: 0, duration: 1.4 }, 0.7)
					.from(
						".portada-entrada",
						{
							opacity: 0,
							y: escritorio ? 22 : 14,
							duration: 0.8,
							stagger: 0.12,
						},
						1.1,
					);

				// Cada pieza sale del centro del vaso: se mide cuánto la separa de él.
				if (vaso) {
					const caja = vaso.getBoundingClientRect();
					const centroX = caja.left + caja.width / 2;
					const centroY = caja.top + caja.height / 2;
					piezas.forEach((pieza, indice) => {
						const lugar = pieza.getBoundingClientRect();
						const sentido = Number(pieza.dataset.sentido ?? 1);
						linea.from(
							pieza,
							{
								x: centroX - (lugar.left + lugar.width / 2),
								y: centroY - (lugar.top + lugar.height / 2),
								scale: 0.2,
								rotation: sentido * -220,
								opacity: 0,
								duration: 1.3,
							},
							0.6 + indice * 0.025,
						);
					});
				}

				// Bucles que siguen tras la entrada: el vaso flota y las piezas se mecen.
				const bucles: gsap.core.Tween[] = [
					gsap.fromTo(
						".portada-vaso-flota",
						{ y: -7 * escala, rotation: -1 },
						{
							y: 7 * escala,
							rotation: 1,
							duration: 5.5,
							ease: "sine.inOut",
							yoyo: true,
							repeat: -1,
							delay: 1.6,
						},
					),
				];
				piezas.forEach((pieza, indice) => {
					const vuelo = pieza.querySelector(".portada-pieza-vuelo");
					if (!vuelo) return;
					const sentido = Number(pieza.dataset.sentido ?? 1);
					const vaiven = Number(pieza.dataset.vaiven ?? 8);
					const ritmo = Number(pieza.dataset.ritmo ?? 6);
					const espera = 1.9 + indice * 0.025;
					// El empuje lateral y la oscilación vertical van desfasados para que no se vea mecánico.
					bucles.push(
						gsap.fromTo(
							vuelo,
							{ x: -20 * sentido * escala, rotation: -vaiven },
							{
								x: 22 * sentido * escala,
								rotation: vaiven,
								duration: ritmo,
								ease: "sine.inOut",
								yoyo: true,
								repeat: -1,
								delay: espera,
							},
						),
						gsap.fromTo(
							vuelo,
							{ y: 7 * escala },
							{
								y: -10 * escala,
								duration: ritmo * 0.6,
								ease: "sine.inOut",
								yoyo: true,
								repeat: -1,
								delay: espera,
							},
						),
					);
				});

				let quitarEscucha: (() => void) | undefined;
				// Costados (solo pantallas anchas): entran desde fuera y se mecen con más amplitud.
				const costados = gsap.utils
					.toArray<HTMLElement>(".portada-costado", raiz)
					.filter((costado) => costado.offsetWidth > 0);
				costados.forEach((costado, indice) => {
					const izquierda = costado.dataset.lado === "izquierda";
					const sentido = Number(costado.dataset.sentido ?? 1);
					const vaiven = Number(costado.dataset.vaiven ?? 8);
					const ritmo = Number(costado.dataset.ritmo ?? 7);
					linea.from(
						costado,
						{
							x: izquierda ? -180 : 180,
							rotation: sentido * -40,
							opacity: 0,
							duration: 1.5,
						},
						0.75 + indice * 0.06,
					);
					const vuelo = costado.querySelector(".portada-pieza-vuelo");
					if (!vuelo) return;
					const espera = 2.2 + indice * 0.06;
					bucles.push(
						gsap.fromTo(
							vuelo,
							{ x: -26 * sentido, rotation: -vaiven },
							{
								x: 28 * sentido,
								rotation: vaiven,
								duration: ritmo,
								ease: "sine.inOut",
								yoyo: true,
								repeat: -1,
								delay: espera,
							},
						),
						gsap.fromTo(
							vuelo,
							{ y: 10 },
							{
								y: -14,
								duration: ritmo * 0.6,
								ease: "sine.inOut",
								yoyo: true,
								repeat: -1,
								delay: espera,
							},
						),
					);
				});

				if (costados.length > 0) {
					// Profundidad: lo cercano se mueve más que lo lejano, con el puntero y al bajar.
					const capas = costados.map((costado) => ({
						profundidad: Number(costado.dataset.profundidad ?? 1),
						capa: costado.querySelector<HTMLElement>(
							".portada-costado-profundidad",
						),
					}));
					const seguidores = capas.flatMap(({ capa, profundidad }) => {
						if (!capa) return [];
						gsap.to(capa, {
							yPercent: -35 * profundidad,
							ease: "none",
							scrollTrigger: {
								trigger: raiz,
								start: "top top",
								end: "bottom top",
								scrub: true,
							},
						});
						return [
							{
								profundidad,
								x: gsap.quickTo(capa, "x", {
									duration: 0.9,
									ease: "power3.out",
								}),
								y: gsap.quickTo(capa, "y", {
									duration: 0.9,
									ease: "power3.out",
								}),
							},
						];
					});
					const escena = raiz.querySelector<HTMLElement>(".portada-escena");
					const escenaX = escena
						? gsap.quickTo(escena, "x", { duration: 1.2, ease: "power3.out" })
						: null;
					const alMover = (evento: PointerEvent) => {
						if (evento.pointerType !== "mouse") return;
						const caja = raiz.getBoundingClientRect();
						// De -1 a 1 desde el centro de la portada.
						const nx = ((evento.clientX - caja.left) / caja.width) * 2 - 1;
						const ny = ((evento.clientY - caja.top) / caja.height) * 2 - 1;
						for (const seguidor of seguidores) {
							seguidor.x(nx * 28 * seguidor.profundidad);
							seguidor.y(ny * 18 * seguidor.profundidad);
						}
						// La escena central se mueve poco y al revés: refuerza la distancia.
						escenaX?.(nx * -8);
					};
					raiz.addEventListener("pointermove", alMover);
					quitarEscucha = () =>
						raiz.removeEventListener("pointermove", alMover);
				}

				ScrollTrigger.create({
					trigger: raiz,
					start: "top bottom",
					end: "bottom top",
					onToggle: ({ isActive }) => {
						for (const bucle of bucles) {
							if (isActive) bucle.resume();
							else bucle.pause();
						}
					},
				});

				if (escritorio) {
					// Al bajar, la escena se queda un poco atrás del texto.
					gsap.to(".portada-escena", {
						yPercent: -8,
						ease: "sine.inOut",
						scrollTrigger: {
							trigger: raiz,
							start: "bottom bottom",
							end: "bottom top",
							scrub: true,
						},
					});
				}

				// matchMedia ejecuta esta limpieza al revertir o al cambiar de tamaño.
				return () => quitarEscucha?.();
			},
		);

		return () => medios.revert();
	}, [portada]);
}
