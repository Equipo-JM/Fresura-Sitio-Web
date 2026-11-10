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

| Carpeta           | Contenido                                         |
| ----------------- | ------------------------------------------------- |
| `src/sitio/`      | Páginas públicas                                  |
| `src/panel/`      | Panel `/admin` (etapa 3)                          |
| `src/compartido/` | Lo que usan el sitio y el panel                   |
| `public/`         | Archivos estáticos, como el contenido de respaldo |
| `pruebas/`        | Pruebas de Vitest                                 |
| `prototipo/`      | Prototipo anterior, solo como referencia          |

Las dependencias se instalan con versión exacta (`npm i -E`) y con al menos dos semanas de publicadas.
