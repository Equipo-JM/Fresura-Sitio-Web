import type { Guion } from "../../supabase/functions/_shared/esquemas/guion";

/** Guion válido de 15 s, en tres escenas contiguas, para las pruebas del agente. */
export function guionDePrueba(): Guion {
	return {
		titulo: "Tu Fresota, a tu manera",
		gancho: "Una cuchara se hunde en la crema: «¿Ya armaste la tuya?»",
		escenas: [
			{
				inicio_s: 0,
				fin_s: 3,
				que_se_ve: "Primer plano de la crema sobre las fresas",
				texto_pantalla: "¿Ya armaste la tuya?",
				voz: "¿Ya armaste la tuya?",
			},
			{
				inicio_s: 3,
				fin_s: 11,
				que_se_ve: "Manos que eligen salsas y toppings",
				texto_pantalla: "Elige base, salsa y toppings",
				voz: "Tú eliges cada capa.",
			},
			{
				inicio_s: 11,
				fin_s: 15,
				que_se_ve: "El vaso terminado frente a la cámara",
				texto_pantalla: "Pídela por WhatsApp",
				voz: "Escríbenos y te la preparamos.",
			},
		],
		llamado_accion: "Escríbenos por WhatsApp y arma tu Fresota.",
		texto_publicacion: "Arma tu Fresota como más te guste 🍓 #Fresura #Fresas",
		musica_sugerida: "Pop alegre, ritmo medio",
		notas_produccion: "Vaso de 13 oz, fresas frescas y luz natural.",
	};
}
