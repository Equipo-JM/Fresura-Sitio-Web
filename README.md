# Fresura · Sitio web

Sitio público y panel administrativo de Fresura. El repositorio tiene dos partes:

- **`frontend/`**: TypeScript, React, Vite y React Router, desplegado como archivos estáticos en Cloudflare.
- **`backend/`**: Supabase (Postgres con RLS, Auth, Storage y las Edge Functions `panel` e `ia`, que corren en Deno).

Un solo `package.json` en la raíz instala las herramientas de las dos partes y tiene todos los comandos.

## Cambio a `frontend/` y `backend/` (16 nov 2026)

El repositorio pasó de tener `src/`, `public/`, `supabase/` y `pruebas/` en la raíz a dividirse en `frontend/` y `backend/` (ADR-001, D17; DT-01, sección 10). Lo que hay que saber:

- **Rutas nuevas:** `src/` → `frontend/src/`, `public/` → `frontend/public/`, `supabase/` → `backend/supabase/`. Las pruebas se repartieron entre `frontend/pruebas/` y `backend/pruebas/`.
- **CLI de Supabase:** ya no funciona `npx supabase <comando>` desde la raíz, porque busca `supabase/` allí. Usa `npm run db:push`, `npm run functions:deploy` o `npm run supabase -- <comando>`; si llamas a la CLI directamente, añade `--workdir backend`.
- **Lo que no cambia:** `.env.local` sigue en la raíz; `npm run dev`, `npm run build`, `npm test` y `npm run deploy` se usan igual.
- **Ramas abiertas de antes del cambio:** trae `main` a tu rama (`git merge origin/main`). Git reconoce los archivos movidos y aplica tus cambios en su ruta nueva; si un archivo tuyo es nuevo y quedó en `src/`, `supabase/` o `pruebas/`, muévelo a su carpeta nueva con `git mv`. Después ejecuta `npm ci` y `npm test`.
- **Editor:** si VS Code tenía abierto el servidor de desarrollo o la extensión de Vitest, reinícialos para que lean las rutas nuevas.

**Pendiente de comprobar:** el primer despliegue real de las funciones con la ruta nueva (`npm run functions:deploy -- ia`), porque `functions deploy` no tiene simulación. Las migraciones sí se comprobaron con `npm run db:push -- --dry-run`, y el frontend con `wrangler dev`. Al hacerlo, revisar que la función responde 401 sin sesión.

## Requisitos

- Node.js 24 (ver `.nvmrc`) y npm.

## Instalación

```bash
npm ci
```

Para el frontend, copiar `.env.example` como `.env.local` en la raíz del repositorio y completar las dos variables `VITE_`.

## Comandos

| Comando                     | Qué hace                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| `npm run dev`               | Servidor de desarrollo del frontend en `http://localhost:5173`                                  |
| `npm run build`             | Revisa los tipos de las dos partes y compila el frontend a `frontend/dist/`                     |
| `npm run preview`           | Sirve la compilación de `frontend/dist/`                                                        |
| `npm test`                  | Pruebas con Vitest de las dos partes (`--project frontend` o `--project backend` para una sola) |
| `npm run check`             | Formato y revisión con Biome                                                                    |
| `npm run deploy`            | Compila y despliega el frontend en Cloudflare con Wrangler (pide `npx wrangler login`)          |
| `npm run db:push`           | Aplica en Supabase las migraciones de `backend/supabase/migrations/`                            |
| `npm run functions:deploy`  | Despliega las funciones de Supabase; con un nombre, solo esa (`-- ia`)                          |
| `npm run supabase -- <...>` | Cualquier otro comando de la CLI de Supabase sobre `backend/` (por ejemplo, `secrets list`)     |

La CLI de Supabase busca la carpeta `supabase/` donde se ejecuta. Como está en `backend/supabase/`, los scripts le pasan `--workdir backend`; si se usa `npx supabase` directamente, hay que añadir esa opción.

## Estructura

| Carpeta                                        | Contenido                                                                                                |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `frontend/src/sitio/`                          | Páginas públicas                                                                                         |
| `frontend/src/panel/`                          | Panel `/admin`                                                                                           |
| `frontend/src/panel/guiones/`                  | Formulario, editor, estados y prompts de video; servicio y hook con cliente del panel inyectado          |
| `frontend/src/compartido/`                     | Lo que usan el sitio y el panel                                                                          |
| `frontend/public/`                             | Lo que se publica tal cual: contenido de respaldo, marca, fotos de ejemplo, `_headers` y `robots.txt`    |
| `frontend/pruebas/`                            | Pruebas de pantallas, carrito y lectura del contenido; `datos/` tiene el contenido de prueba             |
| `backend/supabase/functions/_shared/esquemas/` | Esquemas Zod, únicos para el sitio, el panel y las funciones (contrato de contenido y guion)             |
| `backend/supabase/functions/_shared/`          | Código común de las funciones: esqueleto de la petición, acceso de administrador, variables y respuestas |
| `backend/supabase/functions/panel/`            | Función `panel`: publica el borrador validado con control de revisión y restaura la versión anterior     |
| `backend/supabase/functions/ia/`               | Función `ia`: genera guiones con Gemini (`POST /guion`); `POST /prompt-video` responde 501 por ahora     |
| `backend/supabase/migrations/`                 | Tablas, permisos (RLS), bucket de fotos y semilla del contenido                                          |
| `backend/pruebas/`                             | Pruebas de las funciones y de los esquemas; `datos/` tiene el ejemplo y los casos del contrato           |
| `prototipo/`                                   | Prototipo anterior, solo como referencia                                                                 |
| `.github/workflows/`                           | Revisión automática de cada pull request: Biome, compilación y pruebas                                   |

El frontend importa los esquemas Zod de `backend/supabase/functions/_shared/esquemas/` con una ruta relativa, para que haya una sola definición (DD-33); por eso `frontend/vite.config.ts` permite a Vite servir archivos de fuera de `frontend/`. Las funciones no importan nada del frontend.

Configuración en la raíz, porque las herramientas la buscan allí: `package.json`, `biome.json`, `tsconfig.json` (une `frontend/tsconfig.json`, `backend/tsconfig.json` y `tsconfig.node.json`), `vitest.config.ts` (une las pruebas de las dos partes) y `wrangler.jsonc` (despliega `frontend/dist`). En VS Code aparece agrupada bajo `package.json`, `README.md`, `.gitignore` y `.env.example` (`explorer.fileNesting` en `.vscode/settings.json`).

Las dependencias se instalan con versión exacta (`npm i -E`) y con al menos dos semanas de publicadas. Las de las funciones, que corren en Deno, se fijan en el `deno.json` de cada función. Los archivos de texto usan finales de línea LF en todos los sistemas (`.gitattributes`).

## Rutas del sitio

| Ruta                  | Pantalla                                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `/`                   | Inicio: portada, cinta, «Hoy se me antoja…», promociones, categorías, Nosotros, Google, sedes, «Lo más reciente» y preguntas |
| `/sedes`              | Sedes y contacto, con horarios y enlaces para llegar por Google Maps                                                         |
| `/producto/:id`       | Ficha de un producto: tamaños, qué incluye y las acciones                                                                    |
| `/personalizar/:id`   | Personalización: tamaño, opciones por grupo con límites, cantidad, indicaciones y agregar al carrito                         |
| `/carrito`            | Carrito en tres pasos: tu pedido, entrega y datos, y revisión con el mensaje de WhatsApp                                     |
| `/privacidad`         | Aviso de tratamiento de datos (en revisión)                                                                                  |
| `/admin`              | Panel real: acceso con contraseña, Turnstile y código de la app autenticadora; borrador, publicación y restauración          |
| `/admin/vista-previa` | Sitio con el borrador del administrador, franja de aviso y regreso al panel; sus enlaces conservan esta base                 |

El carrito vive en `sessionStorage` (clave `fresura-carrito`), como en el prototipo. Las reglas de precio, límites y mensaje están en `frontend/src/compartido/carrito/reglas.ts` y tienen pruebas en `frontend/pruebas/carrito.test.ts`.

La sección «Guiones» del panel real permite generar con los productos publicados, editar, copiar y guardar como borrador; también aprobar, descartar, recuperar y eliminar. Editar un aprobado pide confirmación y lo devuelve a borrador; la base borra su prompt. Solo un aprobado permite solicitar el prompt para avatar o escenas. El cliente usa los contratos de `ia/guion` e `ia/prompt-video`; este último sigue respondiendo 501 en esta rama del backend. Ninguna acción de «Guiones» publica contenido. Sus pruebas con cliente simulado están en `frontend/pruebas/guiones-panel.test.tsx`.

## Movimiento

Lenis (desplazamiento suave) y GSAP (entrada de la portada y cinta que responde al desplazamiento) están en `frontend/src/compartido/movimiento/`. Con «reducir movimiento» no se activan y todo queda visible. Versiones exactas: `gsap@3.15.0`, `lenis@1.3.27`.

## Contenido de ejemplo

El sitio lee la versión publicada en Supabase; si no puede o no cumple el contrato, usa `frontend/public/contenido-respaldo.json` (DT-01, sección 22). Ese respaldo trae el menú del rediseño, 6 categorías y 24 productos, sin precios ni promociones, y con él el carrito queda desactivado (DD-14). `frontend/pruebas/datos/contenido-prueba.json` tiene el mismo menú con precios de ejemplo y solo lo usan las pruebas: no se publica. La versión publicada de `fresura-prueba` es el ejemplo del contrato, con un solo producto; para ver el menú completo con precios en el sitio, hay que publicarlo desde el panel cuando exista la edición de contenido.

Las fotos de producto se leen de `imagen.ruta` del contenido: la foto publicada tiene prioridad. Mientras la ruta sea de ejemplo (dominio `.invalid`), se aplica DD-43: textura de crema para «Arma tu», vaso de referencia para chocolate y figura de fresa para los demás; las tarjetas, salvo las de chocolate, tienen una segunda cara al pasar el puntero. Las referencias conservan «Por validar» por sus derechos pendientes. La portada y «Lo más reciente» usan fotos de referencia del kit de marca en `frontend/public/ejemplos/`, marcadas «Por validar»: no consta que Fresura tenga sus derechos, así que se reemplazan antes de publicar. Las fotos de ejemplo de más de 400 px tienen al lado una variante `-400.webp`, que `FotoEjemplo` ofrece con `srcset`. En `frontend/public/ejemplos/productos/` están las fotos provisionales de los productos, en WebP (de 16 a 69 KB), tomadas de la tienda de Fresura en Rappi (una por producto; la de Fresota Ácida repite la de Fresota Explosiva porque allí no tiene foto). Falta que Fresura confirme que el sitio puede usarlas. Todavía no están conectadas al catálogo y se cambiarán por las que entregue Fresura. El contrato aún no tiene campo para esas fotos; mientras tanto se cambian en `frontend/src/sitio/inicio/copy.ts`. Los textos de presentación que el contrato no trae (frases de categoría, selector de antojos y «Lo más reciente») están en el mismo archivo y son propuesta por validar con Fresura.

`/admin` usa el acceso real cuando el entorno tiene `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`: contraseña con Turnstile (clave pública en `frontend/src/compartido/turnstile/useTurnstile.ts`, DD-05) y segundo paso con la app autenticadora; la primera vez muestra el código QR para registrarla. Solo entra el rol `admin` con `aal2`, como exige la base. La sección Versiones permite copiar la publicada a un borrador, guardarlo comprobando la revisión, descartarlo con confirmación, publicar indicando la aprobación de Fresura y restaurar la anterior. Las operaciones y el hook están en `frontend/src/panel/versiones/`; publicar y restaurar requieren el contrato de la función `panel` implementado en su rama correspondiente. La sección Contenido permite editar productos, promociones, preguntas frecuentes, negocio y sedes, opiniones y categorías en el borrador, con validación por campo antes de guardar. Sus componentes y funciones están en `frontend/src/panel/contenido/`. Las fotos se preparan en el navegador y se suben al bucket `fotos` con el SHA-256 del archivo final como nombre, sin sobrescribir; una foto duplicada reutiliza su dirección. La sede que atiende pedidos no se modifica desde estos formularios (DT-01, sección 19.3).

«Ver vista previa» guarda primero el borrador y abre `/admin/vista-previa`. Esa entrada reutiliza las rutas públicas con una base propia, comprueba la sesión y sustituye el contenido solo dentro de la vista previa. Lee el borrador con el cliente del panel y RLS, sin respaldo público ni fotos locales de la demostración. La lectura pública conserva su cliente y su caché independientes.

Sin las variables de Supabase, o con `/admin?demo`, queda el modo demostración con acceso simulado y cambio de fotos. Estas se reducen a WebP de hasta 300 KB (como DD-18) y se guardan en IndexedDB del navegador (`frontend/src/compartido/fotos/`): solo las ve quien las subió, en ese navegador.

Los campos del paso de entrega están validados con Fresura (DT-01, DD-09). Pendiente por validar con Fresura: el número de WhatsApp, los medios de pago y la licencia de Restora Neue (hoy se usa la serif de respaldo).

## Base de datos

Las migraciones de `backend/supabase/migrations/` se aplican con:

```bash
npm run db:push
```

Para ver antes qué se aplicaría, sin cambiar nada: `npm run db:push -- --dry-run`.

En un proyecto nuevo, primero se crea la cuenta del administrador (con `app_metadata.rol = "admin"`) y después se aplican las migraciones: la semilla (`..._semilla_contenido.sql`) usa esa cuenta como autora de la primera versión publicada y no hace nada si ya existe una.

La configuración de Auth se cambia en el panel de Supabase y `backend/supabase/config.toml` la refleja (DT-01, sección 8); no se usa `supabase config push`. Contraseñas: mínimo 12 caracteres con minúsculas, mayúsculas, números y símbolos. La protección contra contraseñas filtradas exige el plan Pro.

## Funciones `panel` e `ia`

Las dos validan el JWT en su código (`verify_jwt = false` en `backend/supabase/config.toml`) y solo atienden a un administrador con segundo paso. Comparten el código de `backend/supabase/functions/_shared/`. Secretos que hay que crear en Supabase (los valores reales nunca van en el repositorio):

```bash
npm run supabase -- secrets set GEMINI_API_KEY=<clave> IA_MODELO=gemini-3.1-flash-lite IA_MODELO_RESPALDO=gemini-3.5-flash-lite ORIGENES_PERMITIDOS=http://localhost:5173
```

En desarrollo, los dos modelos son Flash-Lite (3.1 el principal y 3.5 el respaldo) para no gastar el cupo de 3.8 Flash, que se reserva para la entrega, cuando `IA_MODELO=gemini-3.8-flash`. La función pasa una vez al respaldo si el principal agota su cupo diario o responde 503 por saturación; el registro guarda el tipo de fallo y el código HTTP de Gemini, nunca su mensaje. `ORIGENES_PERMITIDOS` lleva también la dirección del sitio desplegado, separada por comas. `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS` y `SUPABASE_JWKS` los pone Supabase; `panel` usa la clave `default` de `SUPABASE_SECRET_KEYS` para publicar y restaurar.

`panel/index.ts` conecta el acceso y el cliente; `panel/rutas.ts` recibe el cliente para probar las operaciones sin una base real. `POST /publicar` exige `{revision, contenido_real}`; `POST /restaurar`, `{}`. Ambas devuelven `{publicada_en}`. La publicación valida el contrato completo antes de llamar a `publicar_borrador`; si cambia la aprobación a `real`, guarda con control de revisión antes de publicar. Con `contenido_real: false` conserva el estado del borrador (hipótesis pendiente de confirmación por Miguel, DD-26).

```bash
npm run functions:deploy -- ia
```

```bash
npm run functions:deploy -- panel
```

## Despliegue

`npm run deploy` publica `frontend/dist/` como archivos estáticos en Cloudflare. `frontend/public/_headers` aplica la política de seguridad de contenido (CSP), `nosniff`, `noindex` en `/admin` y caché larga en `/assets/`; `frontend/public/robots.txt` excluye `/admin`. El sitemap se agrega cuando haya dominio definitivo. Si se suma otro origen externo (por ejemplo, otro proveedor de imágenes), hay que añadirlo a la CSP.

Cada pull request hacia `main` pasa por `.github/workflows/revision.yml`: `biome ci`, `npm run build` y `npm test`.

Las pruebas de permisos y de la base (PU-01 a PU-06, PU-08 y PU-15) corren contra el proyecto enlazado y no dejan datos, porque todo ocurre en una transacción que no se confirma. Cada fila del resultado debe tener `pasa: true`:

```bash
npm run supabase -- db query --linked -f pruebas/rls/permisos.sql
```

### Si se automatiza el despliegue

Hoy se despliega a mano. Si más adelante se conectan las integraciones con GitHub, estos son los valores con la estructura actual:

| Integración                        | Ajuste                                      | Valor                                                                               |
| ---------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------- |
| Cloudflare Workers Builds          | Directorio raíz                             | La raíz del repositorio (ahí está `wrangler.jsonc`)                                 |
| Cloudflare Workers Builds          | Comando de compilación / de despliegue      | `npm run build` / `npx wrangler deploy`                                             |
| Cloudflare Workers Builds          | Variables de compilación                    | `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (sin `.env.local` en la nube) |
| Integración de Supabase con GitHub | Directorio de trabajo (_Working directory_) | `backend`, la carpeta que contiene `supabase/`                                      |

Según `AGENTS.md`, el despliegue automático se activa solo cuando se revise el flujo de git.
