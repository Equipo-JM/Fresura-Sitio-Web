/// <reference types="vite/client" />

// Solo estas dos variables pueden llevar el prefijo VITE_, porque Vite las
// copia en los archivos públicos (DT-01, sección 6).
interface ImportMetaEnv {
	readonly VITE_SUPABASE_URL?: string;
	readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
