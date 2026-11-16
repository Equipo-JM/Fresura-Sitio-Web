import { createContext } from "react";
import type { ContenidoLeido } from "./obtenerContenido";

/** Sustitución local para la vista previa; fuera del proveedor se lee la publicada. */
export const FuenteContenido = createContext<ContenidoLeido | null>(null);
