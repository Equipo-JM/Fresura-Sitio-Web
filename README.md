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
| `supabase/functions/_shared/esquemas/` | Esquemas Zod, únicos para el sitio, el panel y las funciones (contrato de contenido y guion) |
| `supabase/functions/_shared/`          | Código común de las funciones: acceso de administrador, orígenes permitidos y respuestas |
| `supabase/functions/ia/`               | Función `ia`: genera guiones con Gemini (`POST /guion`)                              |
| `supabase/migrations/`                 | Tablas, permisos (RLS) y bucket de fotos                                             |
| `public/`                              | Archivos estáticos, como el contenido de respaldo                                    |
| `pruebas/`                             | Pruebas de Vitest                                                                    |
| `prototipo/`                           | Prototipo anterior, solo como referencia                                             |

Las dependencias se instalan con versión exacta (`npm i -E`) y con al menos dos semanas de publicadas. Las de las funciones, que corren en Deno, se fijan en el `deno.json` de cada función.

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
