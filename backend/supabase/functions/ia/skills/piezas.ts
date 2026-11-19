/**
 * Reglas de cada pieza que el agente entrega con `entregar_pieza`. Cada flujo
 * se adapta a la herramienta donde se va a usar: lo que acepta, su duración, su
 * formato y lo que hace bien. Ajustar aquí cuando cambie una herramienta.
 */
export const INSTRUCCIONES_PIEZAS = `Piezas de contenido (todas se entregan con entregar_pieza; nunca las escribas solo como texto del chat):
- Antes de entregar, pregunta lo que falte, una decisión por turno con opciones numeradas: tema o producto, red y, si aplica, formato. Usa las herramientas de datos en el turno actual para productos, precios, sedes y promociones.
- Cada pieza lleva un título corto, la red (null si no aplica) y bloques con etiqueta y texto. Cuando la pieza se pega en otra herramienta, el último bloque se llama «Cómo usar» y explica en 2 o 3 pasos qué hacer allí; ese bloque no se copia como prompt.
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

4. prompt_clip (clips cortos en Google Vids con Veo, de 3 a 15 segundos cada uno):
- Un bloque por escena: «Escena 1 (5 s)»… En cada uno, en un párrafo: qué se ve, movimiento de cámara (acercamiento lento, paneo, plano cenital), luz, ritmo y formato vertical 9:16. Sin texto en pantalla ni voces: eso se agrega al editar.
- Si sale de un guion, respeta sus escenas y duraciones. Cierra con «Cómo usar»: crear el clip con IA en Vids por cada escena y unirlos en CapCut con el texto y la música.

5. prompt_heygen (video por escenas en HeyGen; se copia y pega):
- Si no han elegido el formato en esta conversación, pregunta exactamente «¿Cómo quieres el video? 1. Con Presentadora Fresura en cámara (el avatar ya seleccionado en HeyGen). 2. Solo escenas, sin avatar.» y espera la respuesta antes de redactar el prompt. Mencionar HeyGen por sí solo no elige un formato.
- Conserva el formato que la persona eligió expresamente para ese video; un prompt anterior que solo tenía escenas no cuenta como elección. Si pide cambiar de formato, usa el nuevo. Produce un prompt sin avatar solo si la persona eligió esa opción.
- Bloques: «Prompt» (todo el video en un texto) y «Cómo usar». Con avatar, empieza con esta frase exacta: «Usa el avatar Presentadora Fresura ya preseleccionado en HeyGen, con el mismo look y la misma voz guardados. Presentadora Fresura aparece y habla en cámara en todas las escenas principales.» Separa lo que dice el avatar de las indicaciones visuales, escena por escena. Sin avatar, describe cada escena y su texto en pantalla.
- Conserva el guion y la duración acordados; video vertical 9:16. No digas que el video ya se generó.

6. variantes_gancho: 2 o 3 bloques «Opción 1»… con estilos distintos (pregunta, dato del producto, reto o emoción), cada uno de máximo 15 palabras y una línea de por qué funciona.

7. ideas: de 3 a 8 bloques «Idea 1»…, cada uno con formato (video, carrusel, foto o historia), red y una frase de la idea. Básate en las promociones vigentes (ver_promociones), los productos y las fechas especiales cercanas de Colombia (Amor y Amistad en septiembre, Día de la Madre en mayo, Halloween, Navidad, vacaciones de mitad y fin de año). No presentes una idea de campaña como una oferta confirmada.

8. calendario: un bloque por día con publicación, etiquetado con la fecha («Lunes 24 nov»): red, formato y la idea en una línea. Una semana por defecto, o un mes si lo piden; de 3 a 5 publicaciones por semana. Cuenta las fechas a partir de hoy.

9. revision (antes de publicar un texto o guion que pegue la persona): bloques «Datos», «Tono de marca», «Llamado a la acción», «Ortografía» y «Recomendación», cada uno con lo que está bien o lo que hay que cambiar. Compara precios, sedes y promociones con las herramientas y avisa si el contenido publicado es de ejemplo.`;

/**
 * Indicaciones para que el guion coincida con un video de D-ID: D-ID solo
 * genera a la presentadora hablando en una toma, sin escenas de producto.
 */
export const INSTRUCCIONES_GUION_PRESENTADORA = `Guion para la presentadora (D-ID):
- Si la persona dice que el video será con la presentadora en cámara o lo va a renderizar en el chat, escribe todas las escenas con «Qué se ve» igual a «Presentadora Fresura en cámara, plano medio» más el gesto o la emoción; sin tomas de producto, cambios de lugar ni texto en pantalla, porque D-ID genera una sola toma de ella hablando.
- Pon todo el mensaje en la voz y deja el texto en pantalla vacío.
- Elige en instruccion.fondo la foto de fondo que mejor acompañe el mensaje: cafeteria (café claro; general, sirve casi siempre), vitrina (tienda de postres pastel; productos y promociones), fresas (fresas con crema en copa; cuando el centro es un postre de fresas con crema), festivo (mesa de postres; celebraciones y campañas) o flores (flores rosadas; Amor y Amistad, Día de la Madre o mensajes emotivos). Si dudas, cafeteria. En guiones que no son para la presentadora, deja fondo en null.`;
