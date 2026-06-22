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
      ingredients: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          cut_into: number | null
          extras: string[]
          id: string
          order_id: string
          pizza_id: string | null
          pizza_name: string
          prepared: boolean
          removed: string[]
        }
        Insert: {
          created_at?: string
          cut_into?: number | null
          extras?: string[]
          id?: string
          order_id: string
          pizza_id?: string | null
          pizza_name: string
          prepared?: boolean
          removed?: string[]
        }
        Update: {
          created_at?: string
          cut_into?: number | null
          extras?: string[]
          id?: string
          order_id?: string
          pizza_id?: string | null
          pizza_name?: string
          prepared?: boolean
          removed?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_pizza_id_fkey"
            columns: ["pizza_id"]
            isOneToOne: false
            referencedRelation: "pizzas"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone_hash: string | null
          id: string
          notes: string | null
          pains_panino_status: string | null
          prep_start_time: string | null
          requested_time: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone_hash?: string | null
          id?: string
          notes?: string | null
          pains_panino_status?: string | null
          prep_start_time?: string | null
          requested_time: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone_hash?: string | null
          id?: string
          notes?: string | null
          pains_panino_status?: string | null
          prep_start_time?: string | null
          requested_time?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: []
      }
      panino_options: {
        Row: {
          active: boolean
          created_at: string
          id: string
          kind: string
          multi: boolean
          name: string
          product_key: string
          required: boolean
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          kind: string
          multi?: boolean
          name: string
          product_key: string
          required?: boolean
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: string
          multi?: boolean
          name?: string
          product_key?: string
          required?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      panino_order_items: {
        Row: {
          base: string | null
          created_at: string
          done_at: string | null
          extras: string[]
          fries_mode: string | null
          id: string
          order_id: string
          product_key: string
          product_name: string
          removed: string[]
          sauces: string[]
          side: string | null
          status: Database["public"]["Enums"]["panino_item_status"]
        }
        Insert: {
          base?: string | null
          created_at?: string
          done_at?: string | null
          extras?: string[]
          fries_mode?: string | null
          id?: string
          order_id: string
          product_key: string
          product_name: string
          removed?: string[]
          sauces?: string[]
          side?: string | null
          status?: Database["public"]["Enums"]["panino_item_status"]
        }
        Update: {
          base?: string | null
          created_at?: string
          done_at?: string | null
          extras?: string[]
          fries_mode?: string | null
          id?: string
          order_id?: string
          product_key?: string
          product_name?: string
          removed?: string[]
          sauces?: string[]
          side?: string | null
          status?: Database["public"]["Enums"]["panino_item_status"]
        }
        Relationships: []
      }
      panino_products: {
        Row: {
          active: boolean
          created_at: string
          id: string
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          key: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          key?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      pizzas: {
        Row: {
          active: boolean
          created_at: string
          id: string
          image_path: string | null
          ingredients: string[]
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          image_path?: string | null
          ingredients?: string[]
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          image_path?: string | null
          ingredients?: string[]
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      settings: {
        Row: {
          batch_interval_sec: number
          boxing_time_sec: number
          cook_time_sec: number
          id: number
          initial_paton_stock: number
          oven_capacity: number
          paton_losses: number
          prep_time_per_pizza_sec: number
          safety_margin_sec: number
          system_mode: string
          updated_at: string
        }
        Insert: {
          batch_interval_sec?: number
          boxing_time_sec?: number
          cook_time_sec?: number
          id?: number
          initial_paton_stock?: number
          oven_capacity?: number
          paton_losses?: number
          prep_time_per_pizza_sec?: number
          safety_margin_sec?: number
          system_mode?: string
          updated_at?: string
        }
        Update: {
          batch_interval_sec?: number
          boxing_time_sec?: number
          cook_time_sec?: number
          id?: number
          initial_paton_stock?: number
          oven_capacity?: number
          paton_losses?: number
          prep_time_per_pizza_sec?: number
          safety_margin_sec?: number
          system_mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      production_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          is_training_data: boolean
          metadata: Json
          mode: string
          order_id: string | null
          order_item_id: string | null
          product_name: string | null
          product_type: string | null
          station: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          is_training_data?: boolean
          metadata?: Json
          mode?: string
          order_id?: string | null
          order_item_id?: string | null
          product_name?: string | null
          product_type?: string | null
          station: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          is_training_data?: boolean
          metadata?: Json
          mode?: string
          order_id?: string | null
          order_item_id?: string | null
          product_name?: string | null
          product_type?: string | null
          station?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_events: {
        Row: {
          call_duration_seconds: number | null
          call_id: string | null
          created_at: string
          event_type: string
          id: string
          is_training_data: boolean
          mode: string
          phone_number_hash: string | null
        }
        Insert: {
          call_duration_seconds?: number | null
          call_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          is_training_data?: boolean
          mode?: string
          phone_number_hash?: string | null
        }
        Update: {
          call_duration_seconds?: number | null
          call_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          is_training_data?: boolean
          mode?: string
          phone_number_hash?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      order_status: "to_prepare" | "in_oven" | "ready" | "delivered"
      panino_item_status: "pending" | "in_progress" | "done"
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
      order_status: ["to_prepare", "in_oven", "ready", "delivered"],
      panino_item_status: ["pending", "in_progress", "done"],
    },
  },
} as const
