/**
 * Piezas sueltas que vuelan alrededor del vaso en la portada. Las posiciones y
 * los anchos son porcentajes del escenario: el de móvil mide 39:29 y el de
 * escritorio 100:47. Las imágenes están en `public/portada/`, recortadas al
 * borde del objeto y con fondo transparente.
 */
export type PiezaPortada = {
	imagen:
		| "fresa"
		| "media-fresa"
		| "barquillo"
		| "crocantes"
		| "pepita-azul"
		| "pepita-amarilla"
		| "pepita-roja";
	/** Detrás del vaso o delante de él. */
	capa: "atras" | "delante";
	escritorio: { x: number; y: number; ancho: number };
	/** Sin posición de móvil, la pieza no se muestra en pantallas chicas. */
	movil?: { x: number; y: number; ancho: number };
	/** Giro fijo de la imagen, en grados; `espejo` la voltea en horizontal. */
	giro?: number;
	espejo?: boolean;
	/**
	 * Hacia dónde la empuja el viento: 1 a la derecha (piezas de arriba),
	 * -1 a la izquierda (piezas de abajo), como un remolino alrededor del vaso.
	 */
	sentido: 1 | -1;
	/** Cuánto se mece al flotar, en grados. */
	vaiven: number;
	/** Duración de un vaivén, en segundos: cada pieza lleva su propio ritmo. */
	ritmo: number;
};

/** Ancho y alto reales de cada imagen, para reservar su espacio al cargar. */
export const MEDIDAS_PIEZAS: Record<
	PiezaPortada["imagen"] | "vaso",
	{ ancho: number; alto: number }
> = {
	vaso: { ancho: 351, alto: 510 },
	fresa: { ancho: 320, alto: 350 },
	"media-fresa": { ancho: 320, alto: 292 },
	barquillo: { ancho: 360, alto: 331 },
	crocantes: { ancho: 200, alto: 158 },
	"pepita-azul": { ancho: 96, alto: 84 },
	"pepita-amarilla": { ancho: 96, alto: 86 },
	"pepita-roja": { ancho: 96, alto: 83 },
};

/** Composición de la escena, de atrás hacia adelante. */
export const PIEZAS_PORTADA: PiezaPortada[] = [
	{
		imagen: "barquillo",
		capa: "atras",
		escritorio: { x: 73, y: 5, ancho: 14 },
		movil: { x: 72, y: 2, ancho: 19 },
		giro: -6,
		sentido: 1,
		vaiven: 10,
		ritmo: 6.4,
	},
	{
		imagen: "barquillo",
		capa: "atras",
		escritorio: { x: 3, y: 38, ancho: 14 },
		giro: 8,
		espejo: true,
		sentido: -1,
		vaiven: 12,
		ritmo: 7,
	},
	{
		imagen: "crocantes",
		capa: "atras",
		escritorio: { x: 21, y: 3, ancho: 5.5 },
		movil: { x: 26, y: 4, ancho: 8 },
		sentido: 1,
		vaiven: 25,
		ritmo: 5.2,
	},
	{
		imagen: "crocantes",
		capa: "atras",
		escritorio: { x: 84, y: 32, ancho: 5.5 },
		giro: 40,
		sentido: 1,
		vaiven: 30,
		ritmo: 5.8,
	},
	{
		imagen: "pepita-amarilla",
		capa: "atras",
		escritorio: { x: 63, y: 7, ancho: 3 },
		sentido: 1,
		vaiven: 40,
		ritmo: 4.4,
	},
	{
		imagen: "pepita-roja",
		capa: "atras",
		escritorio: { x: 67, y: 25, ancho: 3.2 },
		movil: { x: 69, y: 28, ancho: 4.4 },
		sentido: 1,
		vaiven: 35,
		ritmo: 5,
	},
	{
		imagen: "fresa",
		capa: "delante",
		escritorio: { x: 13, y: 6, ancho: 11 },
		movil: { x: 3, y: 8, ancho: 17 },
		giro: -18,
		sentido: 1,
		vaiven: 10,
		ritmo: 6,
	},
	{
		imagen: "media-fresa",
		capa: "delante",
		escritorio: { x: 20, y: 58, ancho: 11 },
		movil: { x: 5, y: 58, ancho: 16 },
		giro: 10,
		sentido: -1,
		vaiven: 12,
		ritmo: 6.8,
	},
	{
		imagen: "fresa",
		capa: "delante",
		escritorio: { x: 72, y: 52, ancho: 11 },
		movil: { x: 78, y: 52, ancho: 16 },
		giro: -12,
		espejo: true,
		sentido: -1,
		vaiven: 9,
		ritmo: 5.6,
	},
	{
		imagen: "pepita-amarilla",
		capa: "delante",
		escritorio: { x: 27, y: 31, ancho: 3.1 },
		movil: { x: 11, y: 42, ancho: 4.6 },
		sentido: 1,
		vaiven: 45,
		ritmo: 4.6,
	},
	{
		imagen: "pepita-azul",
		capa: "delante",
		escritorio: { x: 34, y: 13, ancho: 3 },
		sentido: 1,
		vaiven: 50,
		ritmo: 5.2,
	},
	{
		imagen: "pepita-azul",
		capa: "delante",
		escritorio: { x: 8, y: 75, ancho: 3.3 },
		movil: { x: 85, y: 36, ancho: 4.6 },
		sentido: -1,
		vaiven: 40,
		ritmo: 5.4,
	},
	{
		imagen: "pepita-roja",
		capa: "delante",
		escritorio: { x: 4, y: 21, ancho: 2.8 },
		sentido: 1,
		vaiven: 35,
		ritmo: 4.8,
	},
	{
		imagen: "pepita-roja",
		capa: "delante",
		escritorio: { x: 64, y: 83, ancho: 3.1 },
		sentido: -1,
		vaiven: 45,
		ritmo: 5,
	},
	{
		imagen: "pepita-amarilla",
		capa: "delante",
		escritorio: { x: 89, y: 51, ancho: 3 },
		sentido: -1,
		vaiven: 40,
		ritmo: 4.4,
	},
	{
		imagen: "pepita-azul",
		capa: "delante",
		escritorio: { x: 58, y: 89, ancho: 2.8 },
		movil: { x: 27, y: 82, ancho: 4.2 },
		sentido: -1,
		vaiven: 50,
		ritmo: 4.9,
	},
	{
		imagen: "crocantes",
		capa: "delante",
		escritorio: { x: 29, y: 75, ancho: 5.5 },
		sentido: -1,
		vaiven: 25,
		ritmo: 4.6,
	},
	{
		imagen: "crocantes",
		capa: "delante",
		escritorio: { x: 87, y: 71, ancho: 5 },
		movil: { x: 67, y: 78, ancho: 7.5 },
		giro: -50,
		sentido: -1,
		vaiven: 30,
		ritmo: 5.9,
	},
];

/**
 * Pieza grande de los costados, solo en escritorio: está «más cerca de la
 * cámara», por eso va desenfocada, se sale del borde y se mueve más que las
 * del centro al mover el puntero o al desplazar.
 */
export type PiezaCostado = {
	imagen: PiezaPortada["imagen"];
	lado: "izquierda" | "derecha";
	/** Distancia al borde de su lado y al techo de la portada, en %. */
	borde: number;
	y: number;
	/** Ancho en `vw`, con un tope en px para pantallas muy anchas. */
	ancho: number;
	tope: number;
	giro?: number;
	espejo?: boolean;
	/** Desenfoque en px: más desenfoque, más cerca. */
	desenfoque: number;
	/** Cuánto la mueve el puntero y el desplazamiento (1 = lo normal). */
	profundidad: number;
	sentido: 1 | -1;
	vaiven: number;
	ritmo: number;
};

/** Composición de los costados: piezas grandes que rellenan el aire lateral. */
export const PIEZAS_COSTADOS: PiezaCostado[] = [
	{
		imagen: "fresa",
		lado: "izquierda",
		borde: -3,
		y: 14,
		ancho: 12,
		tope: 230,
		giro: -24,
		desenfoque: 3,
		profundidad: 1.6,
		sentido: 1,
		vaiven: 8,
		ritmo: 7.4,
	},
	{
		imagen: "pepita-roja",
		lado: "izquierda",
		borde: 13,
		y: 44,
		ancho: 2.2,
		tope: 42,
		desenfoque: 1,
		profundidad: 1.1,
		sentido: 1,
		vaiven: 40,
		ritmo: 5.2,
	},
	{
		imagen: "media-fresa",
		lado: "izquierda",
		borde: 3,
		y: 60,
		ancho: 9,
		tope: 170,
		giro: 18,
		desenfoque: 2,
		profundidad: 1.3,
		sentido: -1,
		vaiven: 10,
		ritmo: 6.6,
	},
	{
		imagen: "barquillo",
		lado: "derecha",
		borde: -2,
		y: 8,
		ancho: 13,
		tope: 250,
		giro: 14,
		desenfoque: 2.5,
		profundidad: 1.5,
		sentido: 1,
		vaiven: 9,
		ritmo: 7.8,
	},
	{
		imagen: "crocantes",
		lado: "derecha",
		borde: 14,
		y: 38,
		ancho: 4.5,
		tope: 86,
		giro: 30,
		desenfoque: 1.2,
		profundidad: 1.1,
		sentido: 1,
		vaiven: 25,
		ritmo: 5.6,
	},
	{
		imagen: "fresa",
		lado: "derecha",
		borde: -2,
		y: 54,
		ancho: 11,
		tope: 210,
		giro: -14,
		espejo: true,
		desenfoque: 3,
		profundidad: 1.7,
		sentido: -1,
		vaiven: 8,
		ritmo: 6.9,
	},
	{
		imagen: "pepita-amarilla",
		lado: "derecha",
		borde: 12,
		y: 76,
		ancho: 2.2,
		tope: 42,
		desenfoque: 1,
		profundidad: 1.2,
		sentido: -1,
		vaiven: 45,
		ritmo: 4.8,
	},
];
