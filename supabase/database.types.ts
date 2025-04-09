export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  wallet: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          currency: string
          details: Json
          id: string
          name: string
          type: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          currency: string
          details: Json
          id?: string
          name: string
          type: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          currency?: string
          details?: Json
          id?: string
          name?: string
          type?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cashu_receive_quotes: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          currency: string
          description: string | null
          expires_at: string
          id: string
          keyset_counter: number | null
          keyset_id: string | null
          output_amounts: number[] | null
          payment_request: string
          quote_id: string
          state: string
          unit: string
          user_id: string
          version: number
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          currency: string
          description?: string | null
          expires_at: string
          id?: string
          keyset_counter?: number | null
          keyset_id?: string | null
          output_amounts?: number[] | null
          payment_request: string
          quote_id: string
          state: string
          unit: string
          user_id: string
          version?: number
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          expires_at?: string
          id?: string
          keyset_counter?: number | null
          keyset_id?: string | null
          output_amounts?: number[] | null
          payment_request?: string
          quote_id?: string
          state?: string
          unit?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cashu_receive_quotes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashu_receive_quotes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cashu_token_swaps: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          currency: string
          keyset_counter: number
          keyset_id: string
          output_amounts: number[]
          state: string
          token_hash: string
          token_proofs: string
          unit: string
          user_id: string
          version: number
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          currency: string
          keyset_counter: number
          keyset_id: string
          output_amounts: number[]
          state?: string
          token_hash: string
          token_proofs: string
          unit: string
          user_id: string
          version?: number
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          currency?: string
          keyset_counter?: number
          keyset_id?: string
          output_amounts?: number[]
          state?: string
          token_hash?: string
          token_proofs?: string
          unit?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cashu_token_swaps_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashu_token_swaps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          default_btc_account_id: string | null
          default_currency: string
          default_usd_account_id: string | null
          email: string | null
          email_verified: boolean
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_btc_account_id?: string | null
          default_currency?: string
          default_usd_account_id?: string | null
          email?: string | null
          email_verified: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_btc_account_id?: string | null
          default_currency?: string
          default_usd_account_id?: string | null
          email?: string | null
          email_verified?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_default_btc_account_id_fkey"
            columns: ["default_btc_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_default_usd_account_id_fkey"
            columns: ["default_usd_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_cashu_receive_quote: {
        Args: {
          p_quote_id: string
          p_quote_version: number
          p_proofs: Json
          p_account_version: number
        }
        Returns: {
          account_id: string
          amount: number
          created_at: string
          currency: string
          description: string | null
          expires_at: string
          id: string
          keyset_counter: number | null
          keyset_id: string | null
          output_amounts: number[] | null
          payment_request: string
          quote_id: string
          state: string
          unit: string
          user_id: string
          version: number
        }
      }
      complete_cashu_token_swap: {
        Args: {
          p_token_hash: string
          p_swap_version: number
          p_proofs: Json
          p_account_version: number
        }
        Returns: undefined
      }
      create_cashu_token_swap: {
        Args: {
          p_token_hash: string
          p_token_proofs: string
          p_account_id: string
          p_user_id: string
          p_currency: string
          p_unit: string
          p_keyset_id: string
          p_keyset_counter: number
          p_output_amounts: number[]
          p_amount: number
          p_account_version: number
        }
        Returns: {
          account_id: string
          amount: number
          created_at: string
          currency: string
          keyset_counter: number
          keyset_id: string
          output_amounts: number[]
          state: string
          token_hash: string
          token_proofs: string
          unit: string
          user_id: string
          version: number
        }
      }
      expire_cashu_receive_quote: {
        Args: {
          p_quote_id: string
          p_quote_version: number
        }
        Returns: {
          account_id: string
          amount: number
          created_at: string
          currency: string
          description: string | null
          expires_at: string
          id: string
          keyset_counter: number | null
          keyset_id: string | null
          output_amounts: number[] | null
          payment_request: string
          quote_id: string
          state: string
          unit: string
          user_id: string
          version: number
        }
      }
      process_cashu_receive_quote_payment: {
        Args: {
          p_quote_id: string
          p_quote_version: number
          p_keyset_id: string
          p_keyset_counter: number
          p_output_amounts: number[]
          p_account_version: number
        }
        Returns: Database["wallet"]["CompositeTypes"]["cashu_receive_quote_payment_result"]
      }
      upsert_user_with_accounts: {
        Args: {
          p_user_id: string
          p_email: string
          p_email_verified: boolean
          p_accounts: Json[]
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      cashu_receive_quote_payment_result: {
        updated_quote:
          | Database["wallet"]["Tables"]["cashu_receive_quotes"]["Row"]
          | null
        updated_account: Database["wallet"]["Tables"]["accounts"]["Row"] | null
      }
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  wallet: {
    Enums: {},
  },
} as const

