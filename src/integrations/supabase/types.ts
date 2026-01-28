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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      commission_settings: {
        Row: {
          created_at: string
          fixed_amount: number
          id: string
          percentage_rate: number
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          volume_tier_1_bonus: number | null
          volume_tier_1_threshold: number | null
          volume_tier_2_bonus: number | null
          volume_tier_2_threshold: number | null
        }
        Insert: {
          created_at?: string
          fixed_amount?: number
          id?: string
          percentage_rate?: number
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          volume_tier_1_bonus?: number | null
          volume_tier_1_threshold?: number | null
          volume_tier_2_bonus?: number | null
          volume_tier_2_threshold?: number | null
        }
        Update: {
          created_at?: string
          fixed_amount?: number
          id?: string
          percentage_rate?: number
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          volume_tier_1_bonus?: number | null
          volume_tier_1_threshold?: number | null
          volume_tier_2_bonus?: number | null
          volume_tier_2_threshold?: number | null
        }
        Relationships: []
      }
      company_expenses: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_code"]
          description: string | null
          due_date: string | null
          expense_date: string
          expense_type: string
          id: string
          paid_at: string | null
          receipt_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_code"]
          description?: string | null
          due_date?: string | null
          expense_date?: string
          expense_type: string
          id?: string
          paid_at?: string | null
          receipt_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_code"]
          description?: string | null
          due_date?: string | null
          expense_date?: string
          expense_type?: string
          id?: string
          paid_at?: string | null
          receipt_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_allocations: {
        Row: {
          allocation_date: string
          allocation_type: string
          amount: number
          approved_by: string | null
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_code"]
          description: string | null
          disbursed_at: string | null
          employee_id: string
          id: string
          status: string
        }
        Insert: {
          allocation_date?: string
          allocation_type: string
          amount: number
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_code"]
          description?: string | null
          disbursed_at?: string | null
          employee_id: string
          id?: string
          status?: string
        }
        Update: {
          allocation_date?: string
          allocation_type?: string
          amount?: number
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_code"]
          description?: string | null
          disbursed_at?: string | null
          employee_id?: string
          id?: string
          status?: string
        }
        Relationships: []
      }
      employee_equipment: {
        Row: {
          assigned_by: string | null
          assigned_date: string
          condition: string | null
          created_at: string
          employee_id: string
          id: string
          item_name: string
          item_type: string
          notes: string | null
          returned_date: string | null
          serial_number: string | null
        }
        Insert: {
          assigned_by?: string | null
          assigned_date?: string
          condition?: string | null
          created_at?: string
          employee_id: string
          id?: string
          item_name: string
          item_type: string
          notes?: string | null
          returned_date?: string | null
          serial_number?: string | null
        }
        Update: {
          assigned_by?: string | null
          assigned_date?: string
          condition?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          item_name?: string
          item_type?: string
          notes?: string | null
          returned_date?: string | null
          serial_number?: string | null
        }
        Relationships: []
      }
      employee_salaries: {
        Row: {
          base_salary: number
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_code"]
          effective_date: string
          employee_id: string
          id: string
          notes: string | null
          payment_frequency: string
          updated_at: string
        }
        Insert: {
          base_salary?: number
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_code"]
          effective_date?: string
          employee_id: string
          id?: string
          notes?: string | null
          payment_frequency?: string
          updated_at?: string
        }
        Update: {
          base_salary?: number
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_code"]
          effective_date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          payment_frequency?: string
          updated_at?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          from_currency: Database["public"]["Enums"]["currency_code"]
          id: string
          rate: number
          to_currency: Database["public"]["Enums"]["currency_code"]
          updated_at: string
        }
        Insert: {
          from_currency: Database["public"]["Enums"]["currency_code"]
          id?: string
          rate: number
          to_currency: Database["public"]["Enums"]["currency_code"]
          updated_at?: string
        }
        Update: {
          from_currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          rate?: number
          to_currency?: Database["public"]["Enums"]["currency_code"]
          updated_at?: string
        }
        Relationships: []
      }
      float_allocations: {
        Row: {
          agent_id: string
          allocated_by: string | null
          amount: number
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          id: string
          notes: string | null
        }
        Insert: {
          agent_id: string
          allocated_by?: string | null
          amount: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          notes?: string | null
        }
        Update: {
          agent_id?: string
          allocated_by?: string | null
          amount?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      payroll_records: {
        Row: {
          approved_by: string | null
          base_amount: number
          commission_amount: number
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          deductions: number
          employee_id: string
          id: string
          net_amount: number
          notes: string | null
          paid_at: string | null
          pay_period_end: string
          pay_period_start: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          base_amount?: number
          commission_amount?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          deductions?: number
          employee_id: string
          id?: string
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          pay_period_end: string
          pay_period_start: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          base_amount?: number
          commission_amount?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          deductions?: number
          employee_id?: string
          id?: string
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          pay_period_end?: string
          pay_period_start?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          national_id_url: string | null
          phone: string | null
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          national_id_url?: string | null
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          national_id_url?: string | null
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      salary_advances: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          employee_id: string
          id: string
          monthly_deduction: number | null
          reason: string | null
          remaining_balance: number
          repayment_plan: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          employee_id: string
          id?: string
          monthly_deduction?: number | null
          reason?: string | null
          remaining_balance: number
          repayment_plan?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          employee_id?: string
          id?: string
          monthly_deduction?: number | null
          reason?: string | null
          remaining_balance?: number
          repayment_plan?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sim_card_inventory: {
        Row: {
          allocated_by: string | null
          allocated_to: string
          allocation_date: string
          created_at: string
          id: string
          notes: string | null
          quantity: number
        }
        Insert: {
          allocated_by?: string | null
          allocated_to: string
          allocation_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          quantity: number
        }
        Update: {
          allocated_by?: string | null
          allocated_to?: string
          allocation_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          quantity?: number
        }
        Relationships: []
      }
      sim_card_sales: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          notes: string | null
          quantity_sold: number
          recorded_by: string | null
          sale_date: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          notes?: string | null
          quantity_sold: number
          recorded_by?: string | null
          sale_date?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          quantity_sold?: number
          recorded_by?: string | null
          sale_date?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          agent_id: string | null
          amount: number
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          approved_by: string | null
          commission_amount: number | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          escalated_at: string | null
          escalated_by: string | null
          escalation_reason: string | null
          id: string
          metadata: Json | null
          recipient_name: string | null
          recipient_phone: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          amount: number
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          commission_amount?: number | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          escalated_at?: string | null
          escalated_by?: string | null
          escalation_reason?: string | null
          id?: string
          metadata?: Json | null
          recipient_name?: string | null
          recipient_phone?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          amount?: number
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          commission_amount?: number | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          escalated_at?: string | null
          escalated_by?: string | null
          escalation_reason?: string | null
          id?: string
          metadata?: Json | null
          recipient_name?: string | null
          recipient_phone?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency: Database["public"]["Enums"]["currency_code"]
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_agent" | "sales_assistant" | "sales_agent" | "hr_finance"
      approval_status: "pending" | "approved" | "rejected" | "escalated"
      currency_code: "USD" | "SSP" | "KES" | "UGX"
      transaction_status:
        | "pending"
        | "approved"
        | "rejected"
        | "completed"
        | "failed"
      transaction_type:
        | "airtime"
        | "mtn_momo"
        | "digicash"
        | "m_gurush"
        | "mpesa_kenya"
        | "uganda_mobile_money"
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
    Enums: {
      app_role: ["super_agent", "sales_assistant", "sales_agent", "hr_finance"],
      approval_status: ["pending", "approved", "rejected", "escalated"],
      currency_code: ["USD", "SSP", "KES", "UGX"],
      transaction_status: [
        "pending",
        "approved",
        "rejected",
        "completed",
        "failed",
      ],
      transaction_type: [
        "airtime",
        "mtn_momo",
        "digicash",
        "m_gurush",
        "mpesa_kenya",
        "uganda_mobile_money",
      ],
    },
  },
} as const
