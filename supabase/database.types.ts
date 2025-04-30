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
          failure_reason: string | null
          id: string
          keyset_counter: number | null
          keyset_id: string | null
          locking_derivation_path: string
          output_amounts: number[] | null
          payment_request: string
          quote_id: string
          state: string
          transaction_id: string
          type: string
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
          failure_reason?: string | null
          id?: string
          keyset_counter?: number | null
          keyset_id?: string | null
          locking_derivation_path: string
          output_amounts?: number[] | null
          payment_request: string
          quote_id: string
          state: string
          transaction_id: string
          type: string
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
          failure_reason?: string | null
          id?: string
          keyset_counter?: number | null
          keyset_id?: string | null
          locking_derivation_path?: string
          output_amounts?: number[] | null
          payment_request?: string
          quote_id?: string
          state?: string
          transaction_id?: string
          type?: string
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
            foreignKeyName: "cashu_receive_quotes_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
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
      cashu_send_quotes: {
        Row: {
          account_id: string
          amount_requested: number
          amount_requested_in_msat: number
          amount_spent: number | null
          amount_to_send: number
          created_at: string
          currency: string
          currency_requested: string
          expires_at: string
          failure_reason: string | null
          fee_reserve: number
          id: string
          keyset_counter: number
          keyset_id: string
          number_of_change_outputs: number
          payment_preimage: string | null
          payment_request: string
          proofs: string
          quote_id: string
          state: string
          transaction_id: string
          unit: string
          user_id: string
          version: number
        }
        Insert: {
          account_id: string
          amount_requested: number
          amount_requested_in_msat: number
          amount_spent?: number | null
          amount_to_send: number
          created_at?: string
          currency: string
          currency_requested: string
          expires_at: string
          failure_reason?: string | null
          fee_reserve: number
          id?: string
          keyset_counter: number
          keyset_id: string
          number_of_change_outputs: number
          payment_preimage?: string | null
          payment_request: string
          proofs: string
          quote_id: string
          state?: string
          transaction_id: string
          unit: string
          user_id: string
          version?: number
        }
        Update: {
          account_id?: string
          amount_requested?: number
          amount_requested_in_msat?: number
          amount_spent?: number | null
          amount_to_send?: number
          created_at?: string
          currency?: string
          currency_requested?: string
          expires_at?: string
          failure_reason?: string | null
          fee_reserve?: number
          id?: string
          keyset_counter?: number
          keyset_id?: string
          number_of_change_outputs?: number
          payment_preimage?: string | null
          payment_request?: string
          proofs?: string
          quote_id?: string
          state?: string
          transaction_id?: string
          unit?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cashu_send_quotes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashu_send_quotes_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashu_send_quotes_user_id_fkey"
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
          created_at: string
          currency: string
          failure_reason: string | null
          fee_amount: number
          input_amount: number
          keyset_counter: number
          keyset_id: string
          output_amounts: number[]
          receive_amount: number
          state: string
          token_hash: string
          token_proofs: string
          transaction_id: string
          unit: string
          user_id: string
          version: number
        }
        Insert: {
          account_id: string
          created_at?: string
          currency: string
          failure_reason?: string | null
          fee_amount: number
          input_amount: number
          keyset_counter: number
          keyset_id: string
          output_amounts: number[]
          receive_amount: number
          state?: string
          token_hash: string
          token_proofs: string
          transaction_id: string
          unit: string
          user_id: string
          version?: number
        }
        Update: {
          account_id?: string
          created_at?: string
          currency?: string
          failure_reason?: string | null
          fee_amount?: number
          input_amount?: number
          keyset_counter?: number
          keyset_id?: string
          output_amounts?: number[]
          receive_amount?: number
          state?: string
          token_hash?: string
          token_proofs?: string
          transaction_id?: string
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
            foreignKeyName: "cashu_token_swaps_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
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
      contacts: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_username_fkey"
            columns: ["username"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["username"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          completed_at: string | null
          created_at: string
          currency: string
          direction: string
          failed_at: string | null
          id: string
          pending_at: string | null
          state: string
          type: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          completed_at?: string | null
          created_at?: string
          currency: string
          direction: string
          failed_at?: string | null
          id?: string
          pending_at?: string | null
          state: string
          type: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          direction?: string
          failed_at?: string | null
          id?: string
          pending_at?: string | null
          state?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          cashu_locking_xpub: string
          created_at: string
          default_btc_account_id: string | null
          default_currency: string
          default_usd_account_id: string | null
          email: string | null
          email_verified: boolean
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          cashu_locking_xpub: string
          created_at?: string
          default_btc_account_id?: string | null
          default_currency?: string
          default_usd_account_id?: string | null
          email?: string | null
          email_verified: boolean
          id?: string
          updated_at?: string
          username: string
        }
        Update: {
          cashu_locking_xpub?: string
          created_at?: string
          default_btc_account_id?: string | null
          default_currency?: string
          default_usd_account_id?: string | null
          email?: string | null
          email_verified?: boolean
          id?: string
          updated_at?: string
          username?: string
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
      check_not_self_contact: {
        Args: { owner_id: string; contact_username: string }
        Returns: boolean
      }
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
          failure_reason: string | null
          id: string
          keyset_counter: number | null
          keyset_id: string | null
          locking_derivation_path: string
          output_amounts: number[] | null
          payment_request: string
          quote_id: string
          state: string
          transaction_id: string
          type: string
          unit: string
          user_id: string
          version: number
        }
      }
      complete_cashu_send_quote: {
        Args: {
          p_quote_id: string
          p_quote_version: number
          p_payment_preimage: string
          p_amount_spent: number
          p_account_proofs: string
          p_account_version: number
        }
        Returns: Database["wallet"]["CompositeTypes"]["update_cashu_send_quote_result"]
      }
      complete_cashu_token_swap: {
        Args: {
          p_token_hash: string
          p_user_id: string
          p_swap_version: number
          p_proofs: Json
          p_account_version: number
        }
        Returns: undefined
      }
      create_cashu_receive_quote: {
        Args: {
          p_user_id: string
          p_account_id: string
          p_amount: number
          p_currency: string
          p_unit: string
          p_quote_id: string
          p_payment_request: string
          p_expires_at: string
          p_state: string
          p_locking_derivation_path: string
          p_receive_type: string
          p_description?: string
        }
        Returns: {
          account_id: string
          amount: number
          created_at: string
          currency: string
          description: string | null
          expires_at: string
          failure_reason: string | null
          id: string
          keyset_counter: number | null
          keyset_id: string | null
          locking_derivation_path: string
          output_amounts: number[] | null
          payment_request: string
          quote_id: string
          state: string
          transaction_id: string
          type: string
          unit: string
          user_id: string
          version: number
        }
      }
      create_cashu_send_quote: {
        Args: {
          p_user_id: string
          p_account_id: string
          p_currency: string
          p_unit: string
          p_payment_request: string
          p_expires_at: string
          p_amount_requested: number
          p_currency_requested: string
          p_amount_requested_in_msat: number
          p_amount_to_send: number
          p_fee_reserve: number
          p_quote_id: string
          p_keyset_id: string
          p_keyset_counter: number
          p_number_of_change_outputs: number
          p_proofs_to_send: string
          p_account_version: number
          p_proofs_to_keep: string
        }
        Returns: Database["wallet"]["CompositeTypes"]["create_cashu_send_quote_result"]
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
          p_input_amount: number
          p_receive_amount: number
          p_fee_amount: number
          p_account_version: number
        }
        Returns: {
          account_id: string
          created_at: string
          currency: string
          failure_reason: string | null
          fee_amount: number
          input_amount: number
          keyset_counter: number
          keyset_id: string
          output_amounts: number[]
          receive_amount: number
          state: string
          token_hash: string
          token_proofs: string
          transaction_id: string
          unit: string
          user_id: string
          version: number
        }
      }
      expire_cashu_receive_quote: {
        Args: { p_quote_id: string; p_quote_version: number }
        Returns: {
          account_id: string
          amount: number
          created_at: string
          currency: string
          description: string | null
          expires_at: string
          failure_reason: string | null
          id: string
          keyset_counter: number | null
          keyset_id: string | null
          locking_derivation_path: string
          output_amounts: number[] | null
          payment_request: string
          quote_id: string
          state: string
          transaction_id: string
          type: string
          unit: string
          user_id: string
          version: number
        }
      }
      expire_cashu_send_quote: {
        Args: {
          p_quote_id: string
          p_quote_version: number
          p_account_proofs: string
          p_account_version: number
        }
        Returns: Database["wallet"]["CompositeTypes"]["update_cashu_send_quote_result"]
      }
      fail_cashu_send_quote: {
        Args: {
          p_quote_id: string
          p_failure_reason: string
          p_quote_version: number
          p_account_proofs: string
          p_account_version: number
        }
        Returns: Database["wallet"]["CompositeTypes"]["update_cashu_send_quote_result"]
      }
      fail_cashu_token_swap: {
        Args: {
          p_token_hash: string
          p_user_id: string
          p_swap_version: number
          p_failure_reason: string
        }
        Returns: undefined
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
      search_users_by_partial_username: {
        Args: { partial_username: string }
        Returns: {
          username: string
          id: string
        }[]
      }
      upsert_user_with_accounts: {
        Args: {
          p_user_id: string
          p_email: string
          p_email_verified: boolean
          p_accounts: Json[]
          p_cashu_locking_xpub: string
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
      create_cashu_send_quote_result: {
        created_quote:
          | Database["wallet"]["Tables"]["cashu_send_quotes"]["Row"]
          | null
        updated_account: Database["wallet"]["Tables"]["accounts"]["Row"] | null
      }
      update_cashu_send_quote_result: {
        updated_quote:
          | Database["wallet"]["Tables"]["cashu_send_quotes"]["Row"]
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

