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
      companies: {
        Row: {
          accent_color: string
          address: string
          created_at: string
          custom_layout: Json
          design_template: string
          email: string
          font_family: string
          id: string
          logo_url: string
          name: string
          phone: string
          primary_color: string
          role: string
          signature_position: string
          signature_url: string
          social_links: string
          tax_number: string
          terms: string
          website: string
        }
        Insert: {
          accent_color?: string
          address?: string
          created_at?: string
          custom_layout?: Json
          design_template?: string
          email?: string
          font_family?: string
          id?: string
          logo_url?: string
          name: string
          phone?: string
          primary_color?: string
          role?: string
          signature_position?: string
          signature_url?: string
          social_links?: string
          tax_number?: string
          terms?: string
          website?: string
        }
        Update: {
          accent_color?: string
          address?: string
          created_at?: string
          custom_layout?: Json
          design_template?: string
          email?: string
          font_family?: string
          id?: string
          logo_url?: string
          name?: string
          phone?: string
          primary_color?: string
          role?: string
          signature_position?: string
          signature_url?: string
          social_links?: string
          tax_number?: string
          terms?: string
          website?: string
        }
        Relationships: []
      }
      company_services: {
        Row: {
          category: string
          company_id: string
          created_at: string
          default_price: number
          description: string
          id: string
          notes: string
          price_label: string
        }
        Insert: {
          category?: string
          company_id: string
          created_at?: string
          default_price?: number
          description: string
          id?: string
          notes?: string
          price_label?: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          default_price?: number
          description?: string
          id?: string
          notes?: string
          price_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          company_service_id: string | null
          created_at: string
          gst_amount: number
          gst_mode: string
          gst_value: number
          id: string
          invoice_id: string
          item_id: string | null
          item_name: string
          line_total: number
          quantity: number
          serial_number: string | null
          subtotal: number
          unit_price: number
        }
        Insert: {
          company_service_id?: string | null
          created_at?: string
          gst_amount?: number
          gst_mode?: string
          gst_value?: number
          id?: string
          invoice_id: string
          item_id?: string | null
          item_name: string
          line_total?: number
          quantity?: number
          serial_number?: string | null
          subtotal?: number
          unit_price?: number
        }
        Update: {
          company_service_id?: string | null
          created_at?: string
          gst_amount?: number
          gst_mode?: string
          gst_value?: number
          id?: string
          invoice_id?: string
          item_id?: string | null
          item_name?: string
          line_total?: number
          quantity?: number
          serial_number?: string | null
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_company_service_id_fkey"
            columns: ["company_service_id"]
            isOneToOne: false
            referencedRelation: "company_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          company_id: string | null
          created_at: string
          customer_address: string
          customer_contact: string
          customer_email: string
          customer_name: string
          customer_tax_number: string
          grand_total: number
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          total_gst: number
          total_quantity: number
          total_subtotal: number
        }
        Insert: {
          amount_paid?: number
          company_id?: string | null
          created_at?: string
          customer_address?: string
          customer_contact?: string
          customer_email?: string
          customer_name?: string
          customer_tax_number?: string
          grand_total?: number
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          total_gst?: number
          total_quantity?: number
          total_subtotal?: number
        }
        Update: {
          amount_paid?: number
          company_id?: string | null
          created_at?: string
          customer_address?: string
          customer_contact?: string
          customer_email?: string
          customer_name?: string
          customer_tax_number?: string
          grand_total?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          total_gst?: number
          total_quantity?: number
          total_subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          created_at: string
          description: string | null
          gst_percent: number
          id: string
          name: string
          price: number
          quantity_available: number
          serial_number: string
          sold_quantity: number
          supplier_company: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          gst_percent?: number
          id?: string
          name: string
          price?: number
          quantity_available?: number
          serial_number: string
          sold_quantity?: number
          supplier_company?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          gst_percent?: number
          id?: string
          name?: string
          price?: number
          quantity_available?: number
          serial_number?: string
          sold_quantity?: number
          supplier_company?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invoice_number: { Args: never; Returns: string }
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
