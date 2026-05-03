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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action_type: string
          created_at: string
          description: string
          id: string
          project_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string
          id?: string
          project_id: string
          user_id: string
          user_name?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string
          id?: string
          project_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      blueprints: {
        Row: {
          created_at: string
          created_by: string | null
          data_url: string
          id: string
          name: string
          project_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_url: string
          id?: string
          name: string
          project_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_url?: string
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blueprints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_comments: {
        Row: {
          change_order_id: string
          created_at: string
          created_by: string | null
          created_by_name: string
          id: string
          project_id: string
          text: string
        }
        Insert: {
          change_order_id: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string
          id?: string
          project_id: string
          text?: string
        }
        Update: {
          change_order_id?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string
          id?: string
          project_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_order_comments_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_name: string
          id: string
          project_id: string
          text: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string
          id?: string
          project_id: string
          text: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string
          id?: string
          project_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      company_invitations: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          expires_at: string
          id: string
          invited_by: string | null
          invited_email: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          invited_email: string
          role: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          invited_email?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          role: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string
          brand_color: string | null
          company_name: string
          created_at: string
          email: string
          id: string
          license_number: string
          logo_url: string | null
          notify_calendar_events: boolean
          notify_invoices: boolean
          notify_notes: boolean
          notify_tasks: boolean
          onboarding_complete: boolean
          phone: string
          updated_at: string
          user_id: string
          website: string
        }
        Insert: {
          address?: string
          brand_color?: string | null
          company_name?: string
          created_at?: string
          email?: string
          id?: string
          license_number?: string
          logo_url?: string | null
          notify_calendar_events?: boolean
          notify_invoices?: boolean
          notify_notes?: boolean
          notify_tasks?: boolean
          onboarding_complete?: boolean
          phone?: string
          updated_at?: string
          user_id: string
          website?: string
        }
        Update: {
          address?: string
          brand_color?: string | null
          company_name?: string
          created_at?: string
          email?: string
          id?: string
          license_number?: string
          logo_url?: string | null
          notify_calendar_events?: boolean
          notify_invoices?: boolean
          notify_notes?: boolean
          notify_tasks?: boolean
          onboarding_complete?: boolean
          phone?: string
          updated_at?: string
          user_id?: string
          website?: string
        }
        Relationships: []
      }
      crew_dispatch: {
        Row: {
          company_id: string
          created_at: string
          dispatch_date: string
          id: string
          member_id: string
          project_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          dispatch_date: string
          id?: string
          member_id: string
          project_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          dispatch_date?: string
          id?: string
          member_id?: string
          project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crew_members: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          name?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          id: string
          log_date: string
          notes: string
          project_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          log_date: string
          notes?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          log_date?: string
          notes?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string
          id: string
          paid: boolean
          project_id: string
          type: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          paid?: boolean
          project_id: string
          type?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          paid?: boolean
          project_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          created_at: string
          created_by: string | null
          data_url: string
          id: string
          name: string
          project_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_url: string
          id?: string
          name: string
          project_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_url?: string
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          brand_color: string | null
          brand_logo_url: string | null
          brand_name: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          brand_color?: string | null
          brand_logo_url?: string | null
          brand_name?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          brand_color?: string | null
          brand_logo_url?: string | null
          brand_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_events: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          project_id: string
          time: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          project_id: string
          time?: string | null
          title?: string
          type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          project_id?: string
          time?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          created_at: string
          description: string
          id: string
          labor_costs: number
          material_costs: number
          name: string
          tasks: Json
          total_budget: number
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          labor_costs?: number
          material_costs?: number
          name?: string
          tasks?: Json
          total_budget?: number
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          labor_costs?: number
          material_costs?: number
          name?: string
          tasks?: Json
          total_budget?: number
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          address: string
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          labor_costs: number
          material_costs: number
          name: string
          parent_id: string | null
          start_date: string
          task_phases: string[]
          total_budget: number
          updated_at: string
        }
        Insert: {
          address?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          labor_costs?: number
          material_costs?: number
          name?: string
          parent_id?: string | null
          start_date?: string
          task_phases?: string[]
          total_budget?: number
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          labor_costs?: number
          material_costs?: number
          name?: string
          parent_id?: string | null
          start_date?: string
          task_phases?: string[]
          total_budget?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_lists: {
        Row: {
          created_at: string
          id: string
          is_locked: boolean
          items: Json
          project_id: string
          signed_off_at: string | null
          signed_off_by: string | null
          signed_off_by_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_locked?: boolean
          items?: Json
          project_id: string
          signed_off_at?: string | null
          signed_off_by?: string | null
          signed_off_by_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_locked?: boolean
          items?: Json
          project_id?: string
          signed_off_at?: string | null
          signed_off_by?: string | null
          signed_off_by_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_notifications: {
        Row: {
          created_at: string
          event_date: string
          event_id: string | null
          event_title: string
          event_type: string
          id: string
          notify_at: string
          project_id: string
          sent: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          event_date: string
          event_id?: string | null
          event_title?: string
          event_type?: string
          id?: string
          notify_at: string
          project_id: string
          sent?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_id?: string | null
          event_title?: string
          event_type?: string
          id?: string
          notify_at?: string
          project_id?: string
          sent?: boolean
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed: boolean
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          notes: string
          parent_task_id: string | null
          phase: string
          priority: string
          project_id: string
          sort_order: number
          tags: string[]
          title: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string
          parent_task_id?: string | null
          phase?: string
          priority?: string
          project_id: string
          sort_order?: number
          tags?: string[]
          title?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string
          parent_task_id?: string | null
          phase?: string
          priority?: string
          project_id?: string
          sort_order?: number
          tags?: string[]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_user_by_email: {
        Args: { _email: string }
        Returns: {
          id: string
        }[]
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_owner: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_editor: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
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
