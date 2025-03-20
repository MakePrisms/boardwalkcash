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
          number_of_blinded_messages: number | null
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
          number_of_blinded_messages?: number | null
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
          number_of_blinded_messages?: number | null
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
          quote_version: number
          proofs: Json
          account_version: number
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
          number_of_blinded_messages: number | null
          payment_request: string
          quote_id: string
          state: string
          unit: string
          user_id: string
          version: number
        }
      }
      create_cashu_receive_quote:
        | {
            Args: {
              user_id: string
              account_id: string
              amount: number
              currency: string
              unit: string
              quote_id: string
              payment_request: string
              expires_at: string
              state: string
              description?: string
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
              number_of_blinded_messages: number | null
              payment_request: string
              quote_id: string
              state: string
              unit: string
              user_id: string
              version: number
            }
          }
        | {
            Args: {
              user_id: string
              account_id: string
              amount: number
              unit: string
              quote_id: string
              payment_request: string
              expires_at: string
              state: string
              description?: string
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
              number_of_blinded_messages: number | null
              payment_request: string
              quote_id: string
              state: string
              unit: string
              user_id: string
              version: number
            }
          }
      expire_cashu_receive_quote: {
        Args: {
          quote_id: string
          quote_version: number
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
          number_of_blinded_messages: number | null
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
          quote_version: number
          p_keyset_id: string
          p_keyset_counter: number
          p_number_of_blinded_messages: number
          account_version: number
        }
        Returns: Database["wallet"]["CompositeTypes"]["cashu_receive_quote_payment_result"]
      }
      upsert_user_with_accounts: {
        Args: {
          user_id: string
          email: string
          email_verified: boolean
          accounts: Json[]
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      cashu_receive_quote_payment_result: {
        updated_quote: unknown
        updated_account: unknown
      }
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

