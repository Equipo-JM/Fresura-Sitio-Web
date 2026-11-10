import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { RutasDelSitio } from "./RutasDelSitio";
// Plus Jakarta Sans se sirve desde el propio sitio, sin pedir nada a Google:
// la política de datos no lista Google Fonts entre quienes intervienen (SRS 11.6).
import "@fontsource/plus-jakarta-sans/300.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "./compartido/estilos/tokens.css";
import "./compartido/estilos/base.css";

const raiz = document.getElementById("raiz");
if (!raiz) {
	throw new Error("Falta el elemento #raiz en index.html");
}

createRoot(raiz).render(
	<StrictMode>
		<BrowserRouter>
			<RutasDelSitio />
		</BrowserRouter>
	</StrictMode>,
);
