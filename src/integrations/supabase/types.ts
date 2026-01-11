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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      comments: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      newsletter_subscriptions: {
        Row: {
          email: string
          id: string
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          subscribed_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          related_prediction_id: string | null
          related_user_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          related_prediction_id?: string | null
          related_user_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          related_prediction_id?: string | null
          related_user_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      prediction_bundles: {
        Row: {
          betting_platform: string | null
          booking_code: string | null
          created_at: string
          created_by: string
          final_status: string | null
          id: string
          name: string
          prediction_type: string
          status: string
          total_odds: number
        }
        Insert: {
          betting_platform?: string | null
          booking_code?: string | null
          created_at?: string
          created_by: string
          final_status?: string | null
          id?: string
          name: string
          prediction_type?: string
          status?: string
          total_odds?: number
        }
        Update: {
          betting_platform?: string | null
          booking_code?: string | null
          created_at?: string
          created_by?: string
          final_status?: string | null
          id?: string
          name?: string
          prediction_type?: string
          status?: string
          total_odds?: number
        }
        Relationships: []
      }
      predictions: {
        Row: {
          bundle_id: string | null
          confidence: number
          created_at: string
          created_by: string | null
          id: string
          match_date: string
          match_name: string
          odds: number
          prediction_text: string
          prediction_type: string
          result: string | null
          sport_category: string | null
          status: string | null
          team_a: string | null
          team_b: string | null
        }
        Insert: {
          bundle_id?: string | null
          confidence: number
          created_at?: string
          created_by?: string | null
          id?: string
          match_date?: string
          match_name: string
          odds: number
          prediction_text: string
          prediction_type: string
          result?: string | null
          sport_category?: string | null
          status?: string | null
          team_a?: string | null
          team_b?: string | null
        }
        Update: {
          bundle_id?: string | null
          confidence?: number
          created_at?: string
          created_by?: string | null
          id?: string
          match_date?: string
          match_name?: string
          odds?: number
          prediction_text?: string
          prediction_type?: string
          result?: string | null
          sport_category?: string | null
          status?: string | null
          team_a?: string | null
          team_b?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "prediction_bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          correct_predictions: number | null
          created_at: string
          display_name: string | null
          email: string
          featured_achievement: string | null
          id: string
          predictions_viewed: number | null
          rank_tier: string | null
          xp_points: number | null
        }
        Insert: {
          correct_predictions?: number | null
          created_at?: string
          display_name?: string | null
          email: string
          featured_achievement?: string | null
          id: string
          predictions_viewed?: number | null
          rank_tier?: string | null
          xp_points?: number | null
        }
        Update: {
          correct_predictions?: number | null
          created_at?: string
          display_name?: string | null
          email?: string
          featured_achievement?: string | null
          id?: string
          predictions_viewed?: number | null
          rank_tier?: string | null
          xp_points?: number | null
        }
        Relationships: []
      }
      seasonal_achievements: {
        Row: {
          achievement_id: string
          created_at: string
          id: string
          season_end: string
          season_start: string
          season_type: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string
          id?: string
          season_end: string
          season_start: string
          season_type: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string
          id?: string
          season_end?: string
          season_start?: string
          season_type?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          payment_email: string | null
          plan_type: string
          registration_status: string | null
          started_at: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          payment_email?: string | null
          plan_type: string
          registration_status?: string | null
          started_at?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          payment_email?: string | null
          plan_type?: string
          registration_status?: string | null
          started_at?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          bundle_id: string | null
          favorited_at: string
          id: string
          prediction_id: string | null
          user_id: string
        }
        Insert: {
          bundle_id?: string | null
          favorited_at?: string
          id?: string
          prediction_id?: string | null
          user_id: string
        }
        Update: {
          bundle_id?: string | null
          favorited_at?: string
          id?: string
          prediction_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_prediction_views: {
        Row: {
          bundle_id: string | null
          id: string
          prediction_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          bundle_id?: string | null
          id?: string
          prediction_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          bundle_id?: string | null
          id?: string
          prediction_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
      user_ranks: {
        Row: {
          badge_color: string
          created_at: string
          id: string
          max_points: number | null
          min_points: number
          name: string
        }
        Insert: {
          badge_color: string
          created_at?: string
          id?: string
          max_points?: number | null
          min_points: number
          name: string
        }
        Update: {
          badge_color?: string
          created_at?: string
          id?: string
          max_points?: number | null
          min_points?: number
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_vip_users: {
        Row: {
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_xp_points: {
        Args: { p_points: number; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
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
