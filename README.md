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

| Carpeta                                | Contenido                                                                                                |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/sitio/`                           | Páginas públicas                                                                                         |
| `src/panel/`                           | Panel `/admin`                                                                                           |
| `src/compartido/`                      | Lo que usan el sitio y el panel                                                                          |
| `supabase/functions/_shared/esquemas/` | Esquemas Zod, únicos para el sitio, el panel y las funciones (contrato de contenido y guion)             |
| `supabase/functions/_shared/`          | Código común de las funciones: esqueleto de la petición, acceso de administrador, variables y respuestas |
| `supabase/functions/panel/`            | Función `panel`: `POST /publicar` y `POST /restaurar` (base lista; responden 501 hasta implementarse)    |
| `supabase/functions/ia/`               | Función `ia`: genera guiones con Gemini (`POST /guion`); `POST /prompt-video` responde 501 por ahora     |
| `supabase/migrations/`                 | Tablas, permisos (RLS), bucket de fotos y semilla del contenido                                          |
| `public/`                              | Lo que se publica tal cual: contenido de respaldo, marca, fotos de ejemplo, `_headers` y `robots.txt`    |
| `pruebas/`                             | Pruebas de Vitest; `pruebas/datos/` tiene el contenido de prueba (24 productos) y los casos del contrato |
| `prototipo/`                           | Prototipo anterior, solo como referencia                                                                 |
| `.github/workflows/`                   | Revisión automática de cada pull request: Biome, compilación y pruebas                                   |

Las dependencias se instalan con versión exacta (`npm i -E`) y con al menos dos semanas de publicadas. Las de las funciones, que corren en Deno, se fijan en el `deno.json` de cada función.

Los archivos de texto usan finales de línea LF en todos los sistemas (`.gitattributes`). En VS Code, la configuración de la raíz aparece agrupada bajo `package.json`, `README.md`, `.gitignore` y `.env.example` (`explorer.fileNesting` en `.vscode/settings.json`); los archivos siguen en la raíz porque las herramientas los buscan allí.

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

El sitio lee la versión publicada en Supabase; si no puede o no cumple el contrato, usa `public/contenido-respaldo.json` (DT-01, sección 22). Ese respaldo trae el menú del rediseño, 6 categorías y 24 productos, sin precios ni promociones, y con él el carrito queda desactivado (DD-14). `pruebas/datos/contenido-prueba.json` tiene el mismo menú con precios de ejemplo y solo lo usan las pruebas: no se publica. La versión publicada de `fresura-prueba` es el ejemplo del contrato, con un solo producto; para ver el menú completo con precios en el sitio, hay que publicarlo desde el panel cuando exista la edición de contenido. Las fotos de producto se leen de `imagen.ruta` del contenido: mientras sean de ejemplo (dominio `.invalid`) se muestra el espacio «Foto del producto», y cuando el panel suba la foto al bucket `fotos` aparece sola. La portada y «Lo más reciente» usan fotos de referencia del kit de marca en `public/ejemplos/`, marcadas «Foto de ejemplo»: no consta que Fresura tenga sus derechos, así que se reemplazan antes de publicar. Las fotos de ejemplo de más de 400 px tienen al lado una variante `-400.webp`, que `FotoEjemplo` ofrece con `srcset`. En `public/ejemplos/productos/` están las fotos provisionales de los productos, en WebP (de 16 a 69 KB), tomadas de la tienda de Fresura en Rappi (una por producto; la de Fresota Ácida repite la de Fresota Explosiva porque allí no tiene foto). Falta que Fresura confirme que el sitio puede usarlas. Todavía no están conectadas al catálogo y se cambiarán por las que entregue Fresura. El contrato aún no tiene campo para esas fotos; mientras tanto se cambian en `src/sitio/inicio/copy.ts`. Los textos de presentación que el contrato no trae (frases de categoría, selector de antojos y «Lo más reciente») están en `src/sitio/inicio/copy.ts` y son propuesta por validar con Fresura.

`/admin` usa el acceso real cuando el entorno tiene `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`: contraseña con Turnstile (clave pública en `src/compartido/turnstile/useTurnstile.ts`, DD-05) y segundo paso con la app autenticadora; la primera vez muestra el código QR para registrarla. Solo entra el rol `admin` con `aal2`, como exige la base. Sin esas variables, o con `/admin?demo`, queda el modo demostración con acceso simulado. En los dos casos, por ahora, las fotos se reducen a WebP de hasta 300 KB (como DD-18) y se guardan en IndexedDB del navegador (`src/compartido/fotos/`): solo las ve quien las subió, en ese navegador. El paso siguiente es subirlas al bucket `fotos` y publicarlas con vista previa.

Los campos del paso de entrega están validados con Fresura (DT-01, DD-09). Pendiente por validar con Fresura: el número de WhatsApp, los medios de pago y la licencia de Restora Neue (hoy se usa la serif de respaldo).

## Base de datos

Las migraciones de `supabase/migrations/` se aplican con:

```bash
npx supabase db push
```

En un proyecto nuevo, primero se crea la cuenta del administrador (con `app_metadata.rol = "admin"`) y después se aplican las migraciones: la semilla (`..._semilla_contenido.sql`) usa esa cuenta como autora de la primera versión publicada y no hace nada si ya existe una.

La configuración de Auth se cambia en el panel de Supabase y `supabase/config.toml` la refleja (DT-01, sección 8); no se usa `supabase config push`. Contraseñas: mínimo 12 caracteres con minúsculas, mayúsculas, números y símbolos. La protección contra contraseñas filtradas exige el plan Pro.

## Funciones `panel` e `ia`

Las dos validan el JWT en su código (`verify_jwt = false` en `supabase/config.toml`) y solo atienden a un administrador con segundo paso. Comparten el código de `supabase/functions/_shared/`. Secretos que hay que crear en Supabase (los valores reales nunca van en el repositorio):

```bash
npx supabase secrets set GEMINI_API_KEY=<clave> IA_MODELO=gemini-3.5-flash-lite IA_MODELO_RESPALDO=gemini-3.5-flash-lite ORIGENES_PERMITIDOS=http://localhost:5173
```

En desarrollo, los dos modelos son Flash-Lite para no gastar el cupo de 3.8 Flash; por eso el paso al modelo de respaldo no se ejercita hasta la entrega, cuando `IA_MODELO=gemini-3.8-flash`. `ORIGENES_PERMITIDOS` lleva también la dirección del sitio desplegado, separada por comas. `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS` y `SUPABASE_JWKS` los pone Supabase; `panel` usará `SUPABASE_SECRET_KEYS` para publicar y restaurar.

```bash
npx supabase functions deploy ia
npx supabase functions deploy panel
```

## Despliegue

`npm run deploy` publica `dist/` como archivos estáticos en Cloudflare. `public/_headers` aplica la política de seguridad de contenido (CSP), `nosniff`, `noindex` en `/admin` y caché larga en `/assets/`; `public/robots.txt` excluye `/admin`. El sitemap se agrega cuando haya dominio definitivo. Si se suma otro origen externo (por ejemplo, otro proveedor de imágenes), hay que añadirlo a la CSP.

Cada pull request hacia `main` pasa por `.github/workflows/revision.yml`: `biome ci`, `npm run build` y `npm test`.
