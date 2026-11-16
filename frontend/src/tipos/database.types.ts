export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: "14.18";
	};
	graphql_public: {
		Tables: {
			[_ in never]: never;
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			graphql: {
				Args: {
					extensions?: Json;
					operationName?: string;
					query?: string;
					variables?: Json;
				};
				Returns: Json;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
	public: {
		Tables: {
			guiones: {
				Row: {
					actualizado_en: string;
					creado_en: string;
					creado_por: string;
					editado: Json;
					estado: Database["public"]["Enums"]["estado_guion"];
					generado: Json;
					id: string;
					instruccion: Json;
				};
				Insert: {
					actualizado_en?: string;
					creado_en?: string;
					creado_por?: string;
					editado: Json;
					estado?: Database["public"]["Enums"]["estado_guion"];
					generado: Json;
					id?: string;
					instruccion: Json;
				};
				Update: {
					actualizado_en?: string;
					creado_en?: string;
					creado_por?: string;
					editado?: Json;
					estado?: Database["public"]["Enums"]["estado_guion"];
					generado?: Json;
					id?: string;
					instruccion?: Json;
				};
				Relationships: [];
			};
			prompts_video: {
				Row: {
					contenido: Json;
					creado_en: string;
					guion_id: string;
					id: string;
				};
				Insert: {
					contenido: Json;
					creado_en?: string;
					guion_id: string;
					id?: string;
				};
				Update: {
					contenido?: Json;
					creado_en?: string;
					guion_id?: string;
					id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "prompts_video_guion_id_fkey";
						columns: ["guion_id"];
						isOneToOne: true;
						referencedRelation: "guiones";
						referencedColumns: ["id"];
					},
				];
			};
			versiones_contenido: {
				Row: {
					actualizada_en: string;
					creada_por: string;
					estado: Database["public"]["Enums"]["estado_contenido"];
					id: string;
					json: Json;
					nota: string | null;
					publicada_en: string | null;
					publicada_por: string | null;
					revision: number;
					version_contrato: string;
				};
				Insert: {
					actualizada_en?: string;
					creada_por?: string;
					estado: Database["public"]["Enums"]["estado_contenido"];
					id?: string;
					json: Json;
					nota?: string | null;
					publicada_en?: string | null;
					publicada_por?: string | null;
					revision?: number;
					version_contrato: string;
				};
				Update: {
					actualizada_en?: string;
					creada_por?: string;
					estado?: Database["public"]["Enums"]["estado_contenido"];
					id?: string;
					json?: Json;
					nota?: string | null;
					publicada_en?: string | null;
					publicada_por?: string | null;
					revision?: number;
					version_contrato?: string;
				};
				Relationships: [];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			es_admin: { Args: never; Returns: boolean };
			publicar_borrador: {
				Args: { revision_esperada: number; usuario: string };
				Returns: string;
			};
			restaurar_anterior: { Args: never; Returns: undefined };
		};
		Enums: {
			estado_contenido: "borrador" | "publicada" | "anterior";
			estado_guion: "borrador" | "aprobado" | "descartado";
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
	keyof Database,
	"public"
>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
				DefaultSchema["Views"])
		? (DefaultSchema["Tables"] &
				DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema["Enums"]
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
		: never = never,
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
		? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema["CompositeTypes"]
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never = never,
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
		? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	graphql_public: {
		Enums: {},
	},
	public: {
		Enums: {
			estado_contenido: ["borrador", "publicada", "anterior"],
			estado_guion: ["borrador", "aprobado", "descartado"],
		},
	},
} as const;
