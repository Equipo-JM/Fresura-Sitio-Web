# Fresura · Sitio web

Sitio público y panel administrativo de Fresura. TypeScript, React, Vite y React Router, desplegado como archivos estáticos en Cloudflare.

## Requisitos

- Node.js 24 (ver `.nvmrc`) y npm.

## Instalación

```bash
npm ci
```

## Comandos

| Comando           | Qué hace                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `npm run dev`     | Servidor de desarrollo en `http://localhost:5173`                                             |
| `npm run build`   | Revisa los tipos y compila a `dist/`                                                          |
| `npm run preview` | Sirve la compilación de `dist/`                                                               |
| `npm test`        | Pruebas con Vitest                                                                            |
| `npm run check`   | Formato y revisión con Biome                                                                  |
| `npm run deploy`  | Compila y despliega en Cloudflare con Wrangler (pide iniciar sesión con `npx wrangler login`) |

## Estructura

| Carpeta                                | Contenido                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/sitio/`                           | Páginas públicas                                                                     |
| `src/panel/`                           | Panel `/admin` (etapa 3)                                                             |
| `src/compartido/`                      | Lo que usan el sitio y el panel                                                      |
| `supabase/functions/_shared/esquemas/` | Esquemas Zod, únicos para el sitio, el panel y las funciones (contrato de contenido) |
| `public/`                              | Archivos estáticos, como el contenido de respaldo                                    |
| `pruebas/`                             | Pruebas de Vitest                                                                    |
| `prototipo/`                           | Prototipo anterior, solo como referencia                                             |

Las dependencias se instalan con versión exacta (`npm i -E`) y con al menos dos semanas de publicadas.

## Rutas del sitio

| Ruta                | Pantalla                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `/`                 | Inicio: portada, «Hoy se me antoja…», menú por categorías, «Lo más reciente», calificación, sedes y preguntas |
| `/producto/:id`     | Ficha de un producto: tamaños, qué incluye y las acciones                                                     |
| `/personalizar/:id` | Personalización: tamaño, opciones por grupo con límites, cantidad, indicaciones y agregar al carrito          |
| `/carrito`          | Carrito en tres pasos: tu pedido, entrega y datos, y revisión con el mensaje de WhatsApp                      |
| `/privacidad`       | Aviso de tratamiento de datos (en revisión)                                                                   |

El carrito vive en `sessionStorage` (clave `fresura-carrito`), como en el prototipo. Las reglas de precio, límites y mensaje están en `src/compartido/carrito/reglas.ts` y tienen pruebas en `pruebas/carrito.test.ts`.

## Movimiento

Lenis (desplazamiento suave) y GSAP (entrada de la portada y cinta que responde al desplazamiento) están en `src/compartido/movimiento/`. Con «reducir movimiento» no se activan y todo queda visible. Versiones exactas: `gsap@3.15.0`, `lenis@1.3.27`.

## Contenido de ejemplo

`public/contenido-prueba.json` (fuente principal mientras no existe la API) y `public/contenido-respaldo.json` traen el menú del rediseño: 6 categorías y 24 productos. El primero incluye precios de ejemplo; el respaldo no publica precios (DD-14). Las fotos de producto se leen de `imagen.ruta` del contenido: mientras sean de ejemplo (dominio `.invalid`) se muestra el espacio «Foto del producto», y cuando el panel suba la foto al bucket `fotos` aparece sola. La portada y «Lo más reciente» usan fotos de referencia del kit de marca en `public/ejemplos/`, marcadas «Foto de ejemplo»: no consta que Fresura tenga sus derechos, así que se reemplazan antes de publicar. El contrato aún no tiene campo para esas fotos; mientras tanto se cambian en `src/sitio/inicio/copy.ts`.

Pendiente por validar con Fresura: correo y casillas del paso de entrega (ver la nota de datos en la bóveda), el número de WhatsApp, los medios de pago y la licencia de Restora Neue (hoy se usa la serif de respaldo).
