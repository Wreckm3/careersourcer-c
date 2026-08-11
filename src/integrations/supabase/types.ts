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
      atlas_memories: {
        Row: {
          completed_foundation_paths: string[]
          completed_milestones: Json
          created_at: string
          current_goal: Json | null
          current_milestone: Json | null
          current_project: Json | null
          current_subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          favourite_technologies: string[]
          interests: string[]
          last_active_date: string
          last_celebrated_milestone: string | null
          learning_pace: string | null
          learning_path: string | null
          learning_style: string | null
          preferred_difficulty: string
          preferred_language: string | null
          project_category: string | null
          recent_conversations: Json
          recent_questions: Json
          schema_version: number
          strengths: string[]
          struggle_log: Json
          time_available_for_learning: string | null
          updated_at: string
          user_id: string
          weaknesses: string[]
        }
        Insert: {
          completed_foundation_paths?: string[]
          completed_milestones?: Json
          created_at?: string
          current_goal?: Json | null
          current_milestone?: Json | null
          current_project?: Json | null
          current_subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          favourite_technologies?: string[]
          interests?: string[]
          last_active_date?: string
          last_celebrated_milestone?: string | null
          learning_pace?: string | null
          learning_path?: string | null
          learning_style?: string | null
          preferred_difficulty?: string
          preferred_language?: string | null
          project_category?: string | null
          recent_conversations?: Json
          recent_questions?: Json
          schema_version?: number
          strengths?: string[]
          struggle_log?: Json
          time_available_for_learning?: string | null
          updated_at?: string
          user_id: string
          weaknesses?: string[]
        }
        Update: {
          completed_foundation_paths?: string[]
          completed_milestones?: Json
          created_at?: string
          current_goal?: Json | null
          current_milestone?: Json | null
          current_project?: Json | null
          current_subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          favourite_technologies?: string[]
          interests?: string[]
          last_active_date?: string
          last_celebrated_milestone?: string | null
          learning_pace?: string | null
          learning_path?: string | null
          learning_style?: string | null
          preferred_difficulty?: string
          preferred_language?: string | null
          project_category?: string | null
          recent_conversations?: Json
          recent_questions?: Json
          schema_version?: number
          strengths?: string[]
          struggle_log?: Json
          time_available_for_learning?: string | null
          updated_at?: string
          user_id?: string
          weaknesses?: string[]
        }
        Relationships: []
      }
      pool_profiles: {
        Row: {
          bio: string | null
          branches: string[]
          contact_link: string | null
          created_at: string
          display_name: string
          headline: string | null
          looking_for: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          branches?: string[]
          contact_link?: string | null
          created_at?: string
          display_name: string
          headline?: string | null
          looking_for?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          branches?: string[]
          contact_link?: string | null
          created_at?: string
          display_name?: string
          headline?: string | null
          looking_for?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_uploads: {
        Row: {
          atlas_feedback: Json | null
          branch_id: string | null
          category_id: string | null
          created_at: string
          description: string | null
          external_url: string | null
          id: string
          lesson_id: string | null
          review_status: Database["public"]["Enums"]["upload_review_status"]
          storage_path: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          atlas_feedback?: Json | null
          branch_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          lesson_id?: string | null
          review_status?: Database["public"]["Enums"]["upload_review_status"]
          storage_path?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          atlas_feedback?: Json | null
          branch_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          lesson_id?: string | null
          review_status?: Database["public"]["Enums"]["upload_review_status"]
          storage_path?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          provider: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          completed_sessions: Json
          selected_path: string | null
          streak_current: number
          streak_days: string[]
          streak_last_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_sessions?: Json
          selected_path?: string | null
          streak_current?: number
          streak_days?: string[]
          streak_last_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_sessions?: Json
          selected_path?: string | null
          streak_current?: number
          streak_days?: string[]
          streak_last_date?: string | null
          updated_at?: string
          user_id?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tier: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["subscription_tier"]
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
      app_role: "admin" | "moderator" | "user"
      subscription_status:
        | "active"
        | "past_due"
        | "canceled"
        | "expired"
        | "trialing"
      subscription_tier: "free" | "builder" | "professional" | "elite"
      upload_review_status: "pending" | "reviewing" | "reviewed" | "rejected"
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
      app_role: ["admin", "moderator", "user"],
      subscription_status: [
        "active",
        "past_due",
        "canceled",
        "expired",
        "trialing",
      ],
      subscription_tier: ["free", "builder", "professional", "elite"],
      upload_review_status: ["pending", "reviewing", "reviewed", "rejected"],
    },
  },
} as const
