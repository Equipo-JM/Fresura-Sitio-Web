import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { RutasDelSitio } from "./RutasDelSitio";

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
