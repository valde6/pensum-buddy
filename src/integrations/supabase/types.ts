export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      begreb: {
        Row: {
          created_at: string
          definition: string | null
          fag_id: string
          forelaesning_id: string | null
          id: string
          navn: string
        }
        Insert: {
          created_at?: string
          definition?: string | null
          fag_id: string
          forelaesning_id?: string | null
          id?: string
          navn: string
        }
        Update: {
          created_at?: string
          definition?: string | null
          fag_id?: string
          forelaesning_id?: string | null
          id?: string
          navn?: string
        }
        Relationships: [
          {
            foreignKeyName: "begreb_fag_id_fkey"
            columns: ["fag_id"]
            isOneToOne: false
            referencedRelation: "fag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "begreb_forelaesning_id_fkey"
            columns: ["forelaesning_id"]
            isOneToOne: false
            referencedRelation: "forelaesning"
            referencedColumns: ["id"]
          },
        ]
      }
      begreb_repetition: {
        Row: {
          begreb_id: string
          bruger_id: string
          id: string
          kunne_den: boolean
          sidst_repeteret: string
        }
        Insert: {
          begreb_id: string
          bruger_id: string
          id?: string
          kunne_den: boolean
          sidst_repeteret?: string
        }
        Update: {
          begreb_id?: string
          bruger_id?: string
          id?: string
          kunne_den?: boolean
          sidst_repeteret?: string
        }
        Relationships: [
          {
            foreignKeyName: "begreb_repetition_begreb_id_fkey"
            columns: ["begreb_id"]
            isOneToOne: false
            referencedRelation: "begreb"
            referencedColumns: ["id"]
          },
        ]
      }
      bruger_kalender: {
        Row: {
          bruger_id: string
          ics_url: string
          id: string
          opdateret_dato: string
        }
        Insert: {
          bruger_id: string
          ics_url: string
          id?: string
          opdateret_dato?: string
        }
        Update: {
          bruger_id?: string
          ics_url?: string
          id?: string
          opdateret_dato?: string
        }
        Relationships: []
      }
      fag: {
        Row: {
          created_at: string
          ects: number
          eksamensdato: string | null
          eksamensdetaljer: string | null
          eksamensform: string | null
          eksamensperiode: string | null
          id: string
          kursusindhold: string | null
          laeringsmaal: string | null
          navn: string
          semester: string | null
        }
        Insert: {
          created_at?: string
          ects?: number
          eksamensdato?: string | null
          eksamensdetaljer?: string | null
          eksamensform?: string | null
          eksamensperiode?: string | null
          id?: string
          kursusindhold?: string | null
          laeringsmaal?: string | null
          navn: string
          semester?: string | null
        }
        Update: {
          created_at?: string
          ects?: number
          eksamensdato?: string | null
          eksamensdetaljer?: string | null
          eksamensform?: string | null
          eksamensperiode?: string | null
          id?: string
          kursusindhold?: string | null
          laeringsmaal?: string | null
          navn?: string
          semester?: string | null
        }
        Relationships: []
      }
      forelaesning: {
        Row: {
          created_at: string
          dato: string | null
          emne: string
          fag_id: string
          id: string
          note_html: string | null
          note_tekst: string | null
          note_url: string | null
          nummer: number
        }
        Insert: {
          created_at?: string
          dato?: string | null
          emne: string
          fag_id: string
          id?: string
          note_html?: string | null
          note_tekst?: string | null
          note_url?: string | null
          nummer: number
        }
        Update: {
          created_at?: string
          dato?: string | null
          emne?: string
          fag_id?: string
          id?: string
          note_html?: string | null
          note_tekst?: string | null
          note_url?: string | null
          nummer?: number
        }
        Relationships: [
          {
            foreignKeyName: "forelaesning_fag_id_fkey"
            columns: ["fag_id"]
            isOneToOne: false
            referencedRelation: "fag"
            referencedColumns: ["id"]
          },
        ]
      }
      fremgang: {
        Row: {
          bruger_id: string
          forelaesning_id: string
          id: string
          opdateret_dato: string
          status: string
        }
        Insert: {
          bruger_id: string
          forelaesning_id: string
          id?: string
          opdateret_dato?: string
          status?: string
        }
        Update: {
          bruger_id?: string
          forelaesning_id?: string
          id?: string
          opdateret_dato?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fremgang_forelaesning_id_fkey"
            columns: ["forelaesning_id"]
            isOneToOne: false
            referencedRelation: "forelaesning"
            referencedColumns: ["id"]
          },
        ]
      }
      kommentar: {
        Row: {
          bruger_id: string
          forelaesning_id: string
          id: string
          oprettet_dato: string
          tekst: string
        }
        Insert: {
          bruger_id: string
          forelaesning_id: string
          id?: string
          oprettet_dato?: string
          tekst: string
        }
        Update: {
          bruger_id?: string
          forelaesning_id?: string
          id?: string
          oprettet_dato?: string
          tekst?: string
        }
        Relationships: [
          {
            foreignKeyName: "kommentar_forelaesning_id_fkey"
            columns: ["forelaesning_id"]
            isOneToOne: false
            referencedRelation: "forelaesning"
            referencedColumns: ["id"]
          },
        ]
      }
      litteratur: {
        Row: {
          created_at: string
          fag_id: string
          forfatter: string | null
          id: string
          titel: string
          type: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          fag_id: string
          forfatter?: string | null
          id?: string
          titel: string
          type?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          fag_id?: string
          forfatter?: string | null
          id?: string
          titel?: string
          type?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "litteratur_fag_id_fkey"
            columns: ["fag_id"]
            isOneToOne: false
            referencedRelation: "fag"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
