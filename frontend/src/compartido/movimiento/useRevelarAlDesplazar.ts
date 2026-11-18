import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useEffect } from "react";
import { MOVIMIENTO, prefiereMenosMovimiento } from "./sistema";

// Grupos que entran juntos y escalonados al aparecer en pantalla. Se animan los
// contenedores (li, artículos) y no las tarjetas: las tarjetas tienen transiciones
// CSS de `transform` en el hover y pelearían con GSAP.
const GRUPOS = [
	".fila-productos > li",
	".explora-tarjetas > li",
	".sedes-grid > .sede",
	".preguntas > details",
	".ficha-bloque",
	".pz-datos > .grupo",
	".cupon",
	".contacto-sedes",
	".reciente-cabeza",
	".destacados-encabezado",
	".lista-antojos > li",
	".favoritos-lista > li",
	".favorito-tarjeta",
].join(", ");

// Entra al aparecer y vuelve a su estado inicial al quedar de nuevo por debajo
// de la pantalla. Así, si un disparador se activa antes de tiempo porque la página
// aún no tenía su altura final, se corrige solo al recalcular.
const REPETIR_AL_VOLVER = "play none none reset";

// Títulos de sección: las palabras suben desde una máscara.
const TITULOS = [
	".destacados h2",
	".explora h2",
	".reciente h2",
	".google-texto h2",
	".capa-encabezado h2",
	".contacto-sedes h2",
].join(", ");

/**
 * Revelados ligados al desplazamiento en todas las páginas públicas: grupos que
 * entran escalonados, títulos por palabras, el relato de Nosotros que se ilumina,
 * valores y reseñas que entran por los lados y la lluvia de fresas del pie. Se
 * reconstruye al cambiar de página o cuando llega el contenido.
 */
export function useRevelarAlDesplazar(ruta: string, cargado: boolean) {
	// biome-ignore lint/correctness/useExhaustiveDependencies: ruta no se lee, pero cada página nueva trae otros elementos que revelar
	useEffect(() => {
		if (!cargado || prefiereMenosMovimiento()) return;
		// Solo animamos elementos que llegan desde debajo de la primera pantalla.
		const entradas = new Set<Animation>();
		const observador = new IntersectionObserver((cambios) => {
			for (const cambio of cambios) {
				if (!cambio.isIntersecting) continue;
				observador.unobserve(cambio.target);
				const entrada = cambio.target.animate(
					[
						{ opacity: 0.9, transform: "translateY(4px)" },
						{ opacity: 1, transform: "none" },
					],
					{ duration: 140, easing: "ease-out" },
				);
				entradas.add(entrada);
				entrada.onfinish = () => entradas.delete(entrada);
			}
		});
		for (const elemento of document.querySelectorAll(
			`main :is(${GRUPOS}, ${TITULOS})`,
		)) {
			if (elemento.getBoundingClientRect().top >= window.innerHeight)
				observador.observe(elemento);
		}
		const contexto = gsap.context(() => {
			// Nosotros: el relato pasa de tenue a pleno según se baja. Nunca baja
			// de 0,45 de opacidad, para que se pueda leer sin desplazar.
			const relato = document.querySelector<HTMLElement>(
				"main .nosotros-texto > p",
			);
			if (relato) {
				const palabras = SplitText.create(relato, { type: "words" });
				gsap.fromTo(
					palabras.words,
					{ opacity: 0.45 },
					{
						opacity: 1,
						stagger: 0.1,
						ease: "none",
						scrollTrigger: {
							trigger: relato,
							start: "top 85%",
							end: "bottom 55%",
							scrub: true,
						},
					},
				);
			}

			// Profundidad en las tarjetas de producto: la foto se desplaza dentro de
			// su arco, más despacio que la página.
			for (const cara of gsap.utils.toArray<HTMLElement>(
				"main .tarjeta-foto .cara",
			))
				gsap.fromTo(
					cara,
					{ yPercent: -6 },
					{
						yPercent: 6,
						ease: "none",
						scrollTrigger: {
							trigger: cara.parentElement,
							start: "top bottom",
							end: "bottom top",
							scrub: 0.6,
						},
					},
				);

			// Lo más reciente: las polaroids llegan torcidas desde abajo y se enderezan
			// mientras se baja; al asentarse, las cintas adhesivas se pegan encima.
			const polaroids = gsap.utils.toArray<HTMLElement>("main .polaroid");
			polaroids.forEach((polaroid, i) => {
				const lado = i - (polaroids.length - 1) / 2;
				gsap.fromTo(
					polaroid,
					{ y: 140, x: lado * 60, rotation: lado * 16 },
					{
						y: 0,
						x: 0,
						rotation: 0,
						ease: "power2.out",
						scrollTrigger: {
							trigger: ".polaroids",
							start: "top 95%",
							end: "top 40%",
							scrub: 0.8,
						},
					},
				);
			});
			const cintas = gsap.utils.toArray<HTMLElement>(
				"main .polaroid .adhesivo",
			);
			if (cintas.length)
				gsap.from(cintas, {
					scaleX: 0,
					opacity: 0,
					transformOrigin: "0% 50%",
					duration: 0.5,
					stagger: 0.12,
					ease: MOVIMIENTO.curva.aterrizar,
					scrollTrigger: {
						trigger: ".polaroids",
						start: "top 45%",
						toggleActions: REPETIR_AL_VOLVER,
					},
				});

			const valores = gsap.utils.toArray<HTMLElement>("main .valores > li");
			if (valores.length)
				gsap.from(valores, {
					y: 60,
					opacity: 0,
					duration: 0.22,
					stagger: { amount: 0.06 },
					ease: MOVIMIENTO.curva.entrada,
					scrollTrigger: {
						trigger: ".valores",
						start: "top 90%",
						toggleActions: REPETIR_AL_VOLVER,
					},
				});

			const resenas = gsap.utils.toArray<HTMLElement>(
				"main .google-resenas > li",
			);
			resenas.forEach((resena, i) => {
				const lado = i - (resenas.length - 1) / 2;
				gsap.from(resena, {
					x: lado * 80,
					y: 60,
					rotation: lado * 4,
					opacity: 0,
					duration: 0.22,
					delay: i * 0.03,
					ease: MOVIMIENTO.curva.entrada,
					scrollTrigger: {
						trigger: ".google-resenas",
						start: "top 88%",
						toggleActions: REPETIR_AL_VOLVER,
					},
				});
			});

			const pie = document.querySelector<HTMLElement>(".pie");
			const fresas = gsap.utils.toArray<HTMLElement>(".pie-lluvia img");
			if (pie && fresas.length)
				ScrollTrigger.create({
					trigger: pie,
					start: "top 75%",
					once: true,
					onEnter: () => {
						const alto = pie.offsetHeight;
						fresas.forEach((fresa, i) => {
							gsap.fromTo(
								fresa,
								{
									left: `${gsap.utils.random(2, 94)}%`,
									y: -60,
									rotation: gsap.utils.random(-40, 40),
									opacity: 0.9,
								},
								{
									y: alto + 20,
									rotation: `+=${gsap.utils.random(-90, 90)}`,
									duration: gsap.utils.random(2.2, 3.6),
									delay: i * 0.03,
									ease: "power1.in",
									onComplete: () => {
										gsap.set(fresa, { opacity: 0 });
									},
								},
							);
						});
					},
				});
		});
		// Las fotos y las fuentes cambian la altura de la página después de montar.
		const refrescar = () => ScrollTrigger.refresh();
		const espera = window.setTimeout(refrescar, 600);
		window.addEventListener("load", refrescar);
		return () => {
			window.clearTimeout(espera);
			window.removeEventListener("load", refrescar);
			observador.disconnect();
			for (const entrada of entradas) entrada.cancel();
			contexto.revert();
		};
	}, [ruta, cargado]);
}
