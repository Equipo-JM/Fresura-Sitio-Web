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

| Carpeta                                | Contenido                                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/sitio/`                           | Páginas públicas                                                                             |
| `src/panel/`                           | Panel `/admin` (etapa 3)                                                                     |
| `src/compartido/`                      | Lo que usan el sitio y el panel                                                              |
| `supabase/functions/_shared/esquemas/` | Esquemas Zod, únicos para el sitio, el panel y las funciones (contrato de contenido y guion) |
| `supabase/functions/_shared/`          | Código común de las funciones: acceso de administrador, orígenes permitidos y respuestas     |
| `supabase/functions/ia/`               | Función `ia`: genera guiones con Gemini (`POST /guion`)                                      |
| `supabase/migrations/`                 | Tablas, permisos (RLS) y bucket de fotos                                                     |
| `public/`                              | Archivos estáticos, como el contenido de respaldo                                            |
| `pruebas/`                             | Pruebas de Vitest                                                                            |
| `prototipo/`                           | Prototipo anterior, solo como referencia                                                     |

Las dependencias se instalan con versión exacta (`npm i -E`) y con al menos dos semanas de publicadas. Las de las funciones, que corren en Deno, se fijan en el `deno.json` de cada función.

## Rutas del sitio

| Ruta                | Pantalla                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| `/`                 | Inicio: portada, «Hoy se me antoja…», menú por categorías, «Lo más reciente», calificación, sedes y preguntas   |
| `/producto/:id`     | Ficha de un producto: tamaños, qué incluye y las acciones                                                       |
| `/personalizar/:id` | Personalización: tamaño, opciones por grupo con límites, cantidad, indicaciones y agregar al carrito            |
| `/carrito`          | Carrito en tres pasos: tu pedido, entrega y datos, y revisión con el mensaje de WhatsApp                        |
| `/privacidad`       | Aviso de tratamiento de datos (en revisión)                                                                     |
| `/admin`            | Panel: acceso con contraseña, Turnstile y código de la app autenticadora; cambio de fotos (portada y productos) |

El carrito vive en `sessionStorage` (clave `fresura-carrito`), como en el prototipo. Las reglas de precio, límites y mensaje están en `src/compartido/carrito/reglas.ts` y tienen pruebas en `pruebas/carrito.test.ts`.

## Movimiento

Lenis (desplazamiento suave) y GSAP (entrada de la portada y cinta que responde al desplazamiento) están en `src/compartido/movimiento/`. Con «reducir movimiento» no se activan y todo queda visible. Versiones exactas: `gsap@3.15.0`, `lenis@1.3.27`.

## Contenido de ejemplo

`public/contenido-prueba.json` (fuente principal mientras no existe la API) y `public/contenido-respaldo.json` traen el menú del rediseño: 6 categorías y 24 productos. El primero incluye precios de ejemplo; el respaldo no publica precios (DD-14). Las fotos de producto se leen de `imagen.ruta` del contenido: mientras sean de ejemplo (dominio `.invalid`) se muestra el espacio «Foto del producto», y cuando el panel suba la foto al bucket `fotos` aparece sola. La portada y «Lo más reciente» usan fotos de referencia del kit de marca en `public/ejemplos/`, marcadas «Foto de ejemplo»: no consta que Fresura tenga sus derechos, así que se reemplazan antes de publicar. El contrato aún no tiene campo para esas fotos; mientras tanto se cambian en `src/sitio/inicio/copy.ts`. Los textos de presentación que el contrato no trae (frases de categoría, selector de antojos y «Lo más reciente») están en `src/sitio/inicio/copy.ts` y son propuesta por validar con Fresura.

`/admin` usa el acceso real cuando el entorno tiene `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`: contraseña con Turnstile (clave pública en `src/compartido/turnstile/useTurnstile.ts`, DD-05) y segundo paso con la app autenticadora; la primera vez muestra el código QR para registrarla. Solo entra el rol `admin` con `aal2`, como exige la base. Sin esas variables, o con `/admin?demo`, queda el modo demostración con acceso simulado. En los dos casos, por ahora, las fotos se reducen a WebP de hasta 300 KB (como DD-18) y se guardan en IndexedDB del navegador (`src/compartido/fotos/`): solo las ve quien las subió, en ese navegador. El paso siguiente es subirlas al bucket `fotos` y publicarlas con vista previa.

Pendiente por validar con Fresura: correo y casillas del paso de entrega (ver la nota de datos en la bóveda), el número de WhatsApp, los medios de pago y la licencia de Restora Neue (hoy se usa la serif de respaldo).

## Función `ia`

Necesita estos secretos en Supabase. Los valores reales nunca van en el repositorio:

```bash
npx supabase secrets set GEMINI_API_KEY=<clave> IA_MODELO=gemini-3.5-flash-lite IA_MODELO_RESPALDO=gemini-3.5-flash-lite ORIGENES_PERMITIDOS=http://localhost:5173
```

En desarrollo, los dos modelos son Flash-Lite para no gastar el cupo de 3.8 Flash. Para la entrega, `IA_MODELO=gemini-3.8-flash`. `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS` y `SUPABASE_JWKS` los pone Supabase.

```bash
npx supabase functions deploy ia
```

La función valida el JWT en su código (`verify_jwt = false` en `supabase/config.toml`) y solo atiende a un administrador con segundo paso.
