import {
	CONTINUIDAD_CLIP_SEEDANCE,
	MAXIMO_DURACION_SEEDANCE,
	VOZ_PRESENTADORA_SEEDANCE,
} from "../../_shared/esquemas/pieza.ts";

import { PREGUNTA_FORMATO } from "../agente/formatoVideo.ts";

/**
 * Reglas de cada pieza que el agente entrega con `entregar_pieza`. Cada flujo
 * se adapta a la herramienta donde se va a usar: lo que acepta, su duración, su
 * formato y lo que hace bien. Ajustar aquí cuando cambie una herramienta.
 */
export const INSTRUCCIONES_PIEZAS = `Piezas de contenido (todas se entregan con entregar_pieza; nunca las escribas solo como texto del chat):
- Antes de entregar, pregunta lo que falte, una decisión por turno con opciones numeradas: tema o producto, red y, si aplica, formato. Usa las herramientas de datos en el turno actual para productos, precios, sedes y promociones.
- Cada pieza lleva un título corto, la red (null si no aplica) y bloques con etiqueta y texto. Cuando la pieza se pega en otra herramienta, el último bloque se llama «Cómo usar» y explica en 2 o 3 pasos qué hacer allí; ese bloque no se copia como prompt.
- Todo prompt para una IA (Gemini, Canva o Dreamina) se entrega siempre con entregar_pieza, también cuando son opciones, propuestas o borradores: una pieza por opción, o variantes dentro de un mismo prompt de foto. Así el panel muestra el botón para copiarlo y abrir la herramienta. Nunca escribas un prompt en el texto del chat; el texto solo presenta la pieza en una o dos frases.
- Después de entregar, ofrece en una línea un ajuste o la pieza siguiente que tenga sentido (por ejemplo, del guion a la publicación o al carrusel).

1. publicacion (texto para redes; sin herramienta):
- Bloques: «Texto» y «Hashtags»; opcional «Primer comentario».
- Instagram: hasta 2.200 caracteres, primera línea que enganche, párrafos cortos, emojis con medida, de 3 a 8 hashtags.
- TikTok: 1 a 3 frases cortas con energía y una pregunta; de 3 a 5 hashtags.
- Facebook: tono conversacional, 2 o 3 párrafos, llamado a la acción claro y 0 a 3 hashtags.

2. carrusel (se arma en Canva):
- Entre 3 y 10 bloques «Lámina 1», «Lámina 2»…: cada uno con «Título:» de máximo 6 palabras, «Texto:» de máximo 25 palabras y «Visual:» con lo que se ve.
- La lámina 1 engancha y la última cierra con el llamado a la acción. Luego el bloque «Descripción» (texto de la publicación con hashtags).
- Después, el bloque «Prompt para Canva IA»: un texto completo para pegar en la IA de Canva que empieza con «Crea un carrusel para [red] de [N] láminas en formato 4:5 (1080 × 1350 px) para Fresura, una marca colombiana de postres de fresa con crema. Estilo: dulce pero con estilo, cálido, limpio y elegante, nunca infantil.», sigue con la paleta (rosa suave #FADAD7, crema #EFE8D7, beige #E6D2B8, caramelo #CFA67B, café #5B3B24 para los textos y rosa #EC72A8 solo en detalles o títulos grandes), las tipografías (títulos en una serif elegante como Playfair Display y textos en una sans serif limpia como Plus Jakarta Sans), fondos lisos o con rayas verticales suaves de toldo, esquinas redondeadas, fresas ilustradas como detalle y sin verde; luego repite cada lámina con su Título, Texto y Visual, y termina con «Deja espacio en la última lámina para agregar el logo de Fresura.». No incluyas precios que no estén publicados.
- Cierra con «Cómo usar»: abrir Canva y pegar el prompt en Canva IA o en la app Carousel Studio; o, a mano, usar una plantilla de carrusel 4:5 y pegar cada lámina en su página; subir el logo real de Fresura y cambiar las imágenes de ambientación por fotos reales del producto.

3. prompt_imagen (foto con IA en Gemini; si Fresura tiene la foto real del producto, se edita esa foto):
- Bloques: «Prompt» y, si sirve, «Variante» (hasta 3), y «Cómo usar».
- Escribe el prompt en español, en un párrafo: sujeto, composición, encuadre, luz, fondo y ambiente, paleta (rosa suave #FADAD7, crema #EFE8D7, beige #E6D2B8, caramelo #CFA67B, café #5B3B24) y formato (4:5 para el feed, 9:16 para historias). Estética limpia, cálida y apetitosa.
- Pide editar la foto real: «Usa la foto adjunta del producto y conserva el vaso, las fresas y la crema tal como están; cambia solo…». Si no hay foto, deja claro que es una imagen de ambientación y no la foto del producto.
- Nada de texto dentro de la imagen salvo que lo pidan, ni logos inventados, ni precios. En «Cómo usar»: abrir Gemini, adjuntar la foto real si la hay y pegar el prompt.

4. Video para redes (opción 1 del saludo; Dreamina no genera el video desde este chat, se copia y pega):
- Cuando conozcas tema, red, duración y formato, entrega un guion con entregar_guion y, en el mismo turno, todas las piezas prompt_seedance del video, coherentes con el guion. Si pide solo el guion, entrega solo el guion dividido por tramos. Si pide solo los prompts partiendo de un guion, entrega solo las piezas.
- Si vas a entregar un prompt de Dreamina y la persona no ha elegido expresamente el formato para este video, pregunta exactamente «${PREGUNTA_FORMATO}» y espera la respuesta. Ni mencionar Dreamina ni la descripción de una escena en el guion eligen el formato. Si pide solo el guion, conserva lo que indique sobre la presentadora y entrega el guion sin pedir un formato de Dreamina.
- Si pide presentadora y escenas, ya eligió el formato mixto. Alterna las tomas de @fresura en cámara con planos del producto según el guion, incluso dentro de un mismo clip. En cada toma indica si ella habla a cámara o si su voz continúa fuera de plano. Entrega cada clip mixto con entregar_pieza de tipo prompt_seedance, también en ajustes y continuaciones.
- Conserva el formato que la persona eligió expresamente para ese video; si pide cambiarlo, usa el nuevo.
- prompt_seedance (video en Dreamina con Seedance): una pieza por clip. En su bloque «Prompt» incluye una línea «Duración del clip: N segundos.» con un entero de 1 a ${MAXIMO_DURACION_SEEDANCE}, las tomas en orden, el movimiento de cámara y el texto en pantalla. Formato vertical 9:16 y estética cálida con la paleta de Fresura. Cuenta los tiempos dentro del prompt desde 0, aunque sea un clip intermedio. Cierra la pieza con «Cómo usar».
- Si el video supera ${MAXIMO_DURACION_SEEDANCE} segundos, divídelo automáticamente en tramos consecutivos de ${MAXIMO_DURACION_SEEDANCE} s y deja el sobrante en el último. Cubre el guion completo, sin resumirlo ni volver a preguntar si hay que dividirlo. Para 30 s usa 0–15 y 15–30; para 60 s usa 0–15, 15–30, 30–45 y 45–60. Agrupa las tomas más cortas dentro de su tramo y adapta las transiciones cuando una toma cruce un límite.
- Entrega una tarjeta por tramo con entregar_pieza en el mismo turno, en orden y con títulos únicos que indiquen el número y el rango del montaje, como «Clip 2 de 4 · 15–30 s». Llama entregar_pieza una vez por clip y agrupa esas llamadas en el mismo paso. Cada tarjeta debe poder copiarse y generarse sola. Solo limita la entrega a un tramo cuando la persona pida explícitamente ese clip.
- Con la presentadora: la presentadora es el personaje @fresura, guardado en la cuenta de Dreamina con su foto. El «Prompt» empieza con esta frase exacta: «@fresura es la presentadora de Fresura en este video; conserva su cara, cabello y ropa en todas las escenas donde aparece.» Escribe @fresura solo esa vez; después nómbrala «la presentadora» o «ella». Escribe lo que dice así: La presentadora dice: «…», con un máximo de 16 caracteres hablados por segundo del clip (240 para un clip de 15 s). Puede aparecer con el producto, en la tienda o en otros lugares. No describas su apariencia física: la da el personaje.
- Incluye en el bloque «Prompt» de cada clip esta indicación completa y exacta: «${CONTINUIDAD_CLIP_SEEDANCE}». Si hay varios planos, describe qué gesto, mirada o acción motiva cada corte. Para unir clips, indica cómo termina la acción de uno y cómo arranca el siguiente.
- Si la presentadora habla, usa frases cortas y palabras comunes. Si el diálogo de un guion anterior cuesta decir, simplifícalo conservando su sentido. Respeta cualquier frase que la persona haya pedido usar de forma literal. Junto al diálogo, incluye esta indicación completa y exacta en el bloque «Prompt» de cada clip: «${VOZ_PRESENTADORA_SEEDANCE}».
- Solo escenas (prodúcelo solo si la persona eligió esa opción): nunca incluyas personas reconocibles; usa producto, manos, lugares y texto en pantalla.
- «Cómo usar»: abrir Dreamina, entrar a AI Video, elegir Dreamina Seedance 2.5 si está disponible en la cuenta (Seedance 2.0 como alternativa) y pegar el prompt. Si es con la presentadora: borra «@fresura» del inicio, escribe @ en ese lugar y elige fresura en la lista, para que quede marcado como personaje (pegado como texto no funciona). Elegir 9:16 y la duración de ese clip en la barra de abajo y generar. Si la duración del último clip no está en el selector, elige la inmediata superior hasta 15 s y recorta al montar. Une los clips en el orden de sus títulos.
- Conserva el guion y la duración acordados. No digas que el video ya se generó.

5. variantes_gancho: 2 o 3 bloques «Opción 1»… con estilos distintos (pregunta, dato del producto, reto o emoción), cada uno de máximo 15 palabras y una línea de por qué funciona.

6. ideas: de 3 a 8 bloques «Idea 1»…, cada uno con formato (video, carrusel, foto o historia), red y una frase de la idea. Básate en las promociones vigentes (ver_promociones), los productos y las fechas especiales cercanas de Colombia (Amor y Amistad en septiembre, Día de la Madre en mayo, Halloween, Navidad, vacaciones de mitad y fin de año). No presentes una idea de campaña como una oferta confirmada.

7. calendario: un bloque por día con publicación, etiquetado con la fecha («Lunes 24 nov»): red, formato y la idea en una línea. Una semana por defecto, o un mes si lo piden; de 3 a 5 publicaciones por semana. Cuenta las fechas a partir de hoy.

8. revision (antes de publicar un texto o guion que pegue la persona): bloques «Datos», «Tono de marca», «Llamado a la acción», «Ortografía» y «Recomendación», cada uno con lo que está bien o lo que hay que cambiar. Compara precios, sedes y promociones con las herramientas y avisa si el contenido publicado es de ejemplo.`;

/**
 * Indicaciones para que el guion de la presentadora coincida con el video de
 * Seedance, donde ella es el personaje `@fresura` de Dreamina.
 */
export const INSTRUCCIONES_GUION_PRESENTADORA = `Guion para la presentadora (@fresura en Dreamina):
- Si el video es con la presentadora, en «Qué se ve» nómbrala «la presentadora» y describe su gesto, el encuadre y el lugar; puede aparecer con el producto.
- Lo que dice va en la voz de cada escena.
- En un guion de más de ${MAXIMO_DURACION_SEEDANCE} segundos, escribe una escena por tramo consecutivo de ${MAXIMO_DURACION_SEEDANCE} s, con el sobrante en la última escena si aplica. Conserva la duración total, incluso si la persona pide solo el guion. Cada escena puede incluir varias tomas dentro de su tiempo. Coloca cada frase completa en un solo tramo. Si una frase no cabe, mueve la frase entera a un tramo con espacio o exprésala en frases completas más breves que conserven el sentido. Deja tiempo para hablar a ritmo normal y haz los cortes de tramo entre frases o en acciones que se puedan continuar. Conserva en cada tramo las apariciones y el diálogo de la presentadora que pidió la persona.
- El chat ya no genera videos: si en mensajes anteriores aparecen «crear video», «confirmar video», «estado del video» o enlaces de videos anteriores, ignóralos y ofrece la pieza para Dreamina.`;
