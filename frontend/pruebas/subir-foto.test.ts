import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { subirFoto } from "../src/panel/contenido/subirFoto";
import type { Database } from "../src/tipos/database.types";

afterEach(() => vi.unstubAllGlobals());

it("no trata un rechazo de permisos como un duplicado", async () => {
	const modulo = "node:crypto";
	const { webcrypto } = (await import(/* @vite-ignore */ modulo)) as {
		webcrypto: Crypto;
	};
	vi.stubGlobal("crypto", webcrypto);
	const foto = {
		type: "image/webp",
		size: 3,
		arrayBuffer: async () => new TextEncoder().encode("abc").buffer,
	} as Blob;
	const cliente = {
		storage: {
			from: () => ({
				upload: async () => ({
					error: { statusCode: "403", message: "Forbidden" },
				}),
				getPublicUrl: () => {
					throw new Error("No debe devolver una dirección");
				},
			}),
		},
	} as unknown as SupabaseClient<Database>;
	await expect(
		subirFoto(
			cliente,
			new File(["x"], "foto.png", { type: "image/png" }),
			"Foto",
			{
				preparar: async () => foto,
				medir: async () => ({ ancho: 20, alto: 20 }),
			},
		),
	).rejects.toThrow("No pudimos subir la foto. Inténtalo de nuevo.");
});

it("no sube un archivo preparado que todavía supera 300 KB", async () => {
	await expect(
		subirFoto(
			{} as SupabaseClient<Database>,
			new File(["x"], "foto.png", { type: "image/png" }),
			"Foto",
			{
				preparar: async () =>
					new Blob([new Uint8Array(300 * 1024 + 1)], { type: "image/webp" }),
				medir: async () => ({ ancho: 20, alto: 20 }),
			},
		),
	).rejects.toThrow(
		"Usa una foto JPG, PNG o WebP. La reducimos por ti; si no alcanza, prueba con otra.",
	);
});

describe.each(["image/webp", "image/jpeg"])(
	"fotos con nombre por contenido (%s)",
	(tipo) => {
		it.each([
			null,
			{ statusCode: "409", message: "The resource already exists" },
			{ statusCode: "400", message: "The resource already exists" },
		])(
			"usa el archivo final y devuelve la misma dirección para una foto nueva o duplicada (%j)",
			async (error) => {
				const modulo = "node:crypto";
				const { webcrypto } = (await import(/* @vite-ignore */ modulo)) as {
					webcrypto: Crypto;
				};
				vi.stubGlobal("crypto", webcrypto);
				const final = {
					type: tipo,
					size: 3,
					arrayBuffer: async () => new TextEncoder().encode("abc").buffer,
				} as Blob;
				const upload = vi.fn(async () => ({ error }));
				const bucket = {
					upload,
					getPublicUrl: (ruta: string) => ({
						data: { publicUrl: `https://fotos.test/${ruta}` },
					}),
				};
				const cliente = {
					storage: {
						from: (nombre: string) => {
							expect(nombre).toBe("fotos");
							return bucket;
						},
					},
				} as unknown as SupabaseClient<Database>;
				const imagen = await subirFoto(
					cliente,
					new File(["original"], "foto.png", { type: "image/png" }),
					"Fresas",
					{
						preparar: async () => final,
						medir: async () => ({ ancho: 600, alto: 400 }),
					},
				);
				expect(imagen).toEqual({
					ruta: `https://fotos.test/ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad.${tipo === "image/webp" ? "webp" : "jpg"}`,
					alt: "Fresas",
					ancho: 600,
					alto: 400,
				});
				expect(upload).toHaveBeenCalledWith(
					`ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad.${tipo === "image/webp" ? "webp" : "jpg"}`,
					final,
					{ upsert: false, contentType: tipo },
				);
			},
		);
		it("rechaza una foto no admitida sin acceder al cliente", async () => {
			const cliente = {} as SupabaseClient<Database>;
			await expect(
				subirFoto(
					cliente,
					new File(["x"], "foto.svg", { type: "image/svg+xml" }),
					"Foto",
				),
			).rejects.toThrow(
				"Usa una foto JPG, PNG o WebP. La reducimos por ti; si no alcanza, prueba con otra.",
			);
		});
	},
);
