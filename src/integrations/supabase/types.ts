export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      ai_analyses: {
        Row: {
          assessment: string | null;
          category: string;
          complaint_id: string;
          confidence: string;
          created_at: string;
          description: string;
          id: string;
          issue_type: string;
          kind: string;
          raw: Json;
          reason: string | null;
          risk: string;
          severity: string;
          suggested_department: string;
        };
        Insert: {
          assessment?: string | null;
          category?: string;
          complaint_id: string;
          confidence?: string;
          created_at?: string;
          description?: string;
          id?: string;
          issue_type?: string;
          kind?: string;
          raw?: Json;
          reason?: string | null;
          risk?: string;
          severity?: string;
          suggested_department?: string;
        };
        Update: {
          assessment?: string | null;
          category?: string;
          complaint_id?: string;
          confidence?: string;
          created_at?: string;
          description?: string;
          id?: string;
          issue_type?: string;
          kind?: string;
          raw?: Json;
          reason?: string | null;
          risk?: string;
          severity?: string;
          suggested_department?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_analyses_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
        ];
      };
      assignments: {
        Row: {
          assigned_by: string | null;
          complaint_id: string;
          created_at: string;
          department_id: string;
          id: string;
          note: string;
        };
        Insert: {
          assigned_by?: string | null;
          complaint_id: string;
          created_at?: string;
          department_id: string;
          id?: string;
          note?: string;
        };
        Update: {
          assigned_by?: string | null;
          complaint_id?: string;
          created_at?: string;
          department_id?: string;
          id?: string;
          note?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
        ];
      };
      citizen_verifications: {
        Row: {
          comment: string;
          complaint_id: string;
          created_at: string;
          evidence_url: string | null;
          id: string;
          is_verified: boolean;
          reason: string;
          user_id: string;
        };
        Insert: {
          comment?: string;
          complaint_id: string;
          created_at?: string;
          evidence_url?: string | null;
          id?: string;
          is_verified: boolean;
          reason?: string;
          user_id: string;
        };
        Update: {
          comment?: string;
          complaint_id?: string;
          created_at?: string;
          evidence_url?: string | null;
          id?: string;
          is_verified?: boolean;
          reason?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "citizen_verifications_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
        ];
      };
      community_support: {
        Row: {
          complaint_id: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          complaint_id: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          complaint_id?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "community_support_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
        ];
      };
      complaint_images: {
        Row: {
          complaint_id: string;
          created_at: string;
          id: string;
          image_url: string;
          kind: string;
          uploaded_by: string | null;
        };
        Insert: {
          complaint_id: string;
          created_at?: string;
          id?: string;
          image_url: string;
          kind?: string;
          uploaded_by?: string | null;
        };
        Update: {
          complaint_id?: string;
          created_at?: string;
          id?: string;
          image_url?: string;
          kind?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "complaint_images_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
        ];
      };
      complaints: {
        Row: {
          address: string;
          category: string;
          created_at: string;
          department_id: string | null;
          description: string;
          display_id: string;
          id: string;
          is_demo: boolean;
          is_emergency: boolean;
          latitude: number;
          longitude: number;
          priority_breakdown: Json;
          priority_score: number;
          emergency_assessment: Json;
          severity: Database["public"]["Enums"]["severity_level"];
          status: Database["public"]["Enums"]["complaint_status"];
          suggested_department: string;
          support_count: number;
          voice_note_url: string | null;
          voice_transcript: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          address?: string;
          category?: string;
          created_at?: string;
          department_id?: string | null;
          description?: string;
          display_id?: string;
          id?: string;
          is_demo?: boolean;
          is_emergency?: boolean;
          latitude: number;
          longitude: number;
          priority_breakdown?: Json;
          priority_score?: number;
          emergency_assessment?: Json;
          severity?: Database["public"]["Enums"]["severity_level"];
          status?: Database["public"]["Enums"]["complaint_status"];
          suggested_department?: string;
          support_count?: number;
          voice_note_url?: string | null;
          voice_transcript?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          address?: string;
          category?: string;
          created_at?: string;
          department_id?: string | null;
          description?: string;
          display_id?: string;
          id?: string;
          is_demo?: boolean;
          is_emergency?: boolean;
          latitude?: number;
          longitude?: number;
          priority_breakdown?: Json;
          priority_score?: number;
          emergency_assessment?: Json;
          severity?: Database["public"]["Enums"]["severity_level"];
          status?: Database["public"]["Enums"]["complaint_status"];
          suggested_department?: string;
          support_count?: number;
          voice_note_url?: string | null;
          voice_transcript?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "complaints_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
        ];
      };
      departments: {
        Row: {
          contact_email: string;
          created_at: string;
          description: string;
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          contact_email?: string;
          created_at?: string;
          description?: string;
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          contact_email?: string;
          created_at?: string;
          description?: string;
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      escalations: {
        Row: {
          complaint_id: string;
          created_at: string;
          created_by: string | null;
          detail: string;
          id: string;
          reason: string;
          status: string;
        };
        Insert: {
          complaint_id: string;
          created_at?: string;
          created_by?: string | null;
          detail?: string;
          id?: string;
          reason: string;
          status?: string;
        };
        Update: {
          complaint_id?: string;
          created_at?: string;
          created_by?: string | null;
          detail?: string;
          id?: string;
          reason?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "escalations_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          complaint_id: string | null;
          created_at: string;
          event: string;
          id: string;
          is_read: boolean;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string;
          complaint_id?: string | null;
          created_at?: string;
          event?: string;
          id?: string;
          is_read?: boolean;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string;
          complaint_id?: string | null;
          created_at?: string;
          event?: string;
          id?: string;
          is_read?: boolean;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      resolution_evidence: {
        Row: {
          after_image_url: string;
          ai_assessment: string | null;
          ai_confidence: string | null;
          ai_reason: string | null;
          before_image_url: string;
          complaint_id: string;
          created_at: string;
          id: string;
          notes: string;
          submitted_by: string | null;
        };
        Insert: {
          after_image_url: string;
          ai_assessment?: string | null;
          ai_confidence?: string | null;
          ai_reason?: string | null;
          before_image_url?: string;
          complaint_id: string;
          created_at?: string;
          id?: string;
          notes?: string;
          submitted_by?: string | null;
        };
        Update: {
          after_image_url?: string;
          ai_assessment?: string | null;
          ai_confidence?: string | null;
          ai_reason?: string | null;
          before_image_url?: string;
          complaint_id?: string;
          created_at?: string;
          id?: string;
          notes?: string;
          submitted_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "resolution_evidence_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
        ];
      };
      status_history: {
        Row: {
          changed_by: string | null;
          complaint_id: string;
          created_at: string;
          from_status: Database["public"]["Enums"]["complaint_status"] | null;
          id: string;
          note: string;
          to_status: Database["public"]["Enums"]["complaint_status"];
        };
        Insert: {
          changed_by?: string | null;
          complaint_id: string;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["complaint_status"] | null;
          id?: string;
          note?: string;
          to_status: Database["public"]["Enums"]["complaint_status"];
        };
        Update: {
          changed_by?: string | null;
          complaint_id?: string;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["complaint_status"] | null;
          id?: string;
          note?: string;
          to_status?: Database["public"]["Enums"]["complaint_status"];
        };
        Relationships: [
          {
            foreignKeyName: "status_history_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      next_complaint_display_id: { Args: never; Returns: string };
    };
    Enums: {
      app_role: "CITIZEN" | "ADMIN";
      complaint_status:
        | "SUBMITTED"
        | "AI_VERIFIED"
        | "ASSIGNED"
        | "IN_PROGRESS"
        | "RESOLUTION_SUBMITTED"
        | "CITIZEN_VERIFICATION"
        | "RESOLVED"
        | "REOPENED"
        | "ESCALATED";
      severity_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["CITIZEN", "ADMIN"],
      complaint_status: [
        "SUBMITTED",
        "AI_VERIFIED",
        "ASSIGNED",
        "IN_PROGRESS",
        "RESOLUTION_SUBMITTED",
        "CITIZEN_VERIFICATION",
        "RESOLVED",
        "REOPENED",
        "ESCALATED",
      ],
      severity_level: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    },
  },
} as const;
