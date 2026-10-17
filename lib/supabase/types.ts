export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          created_at: string;
          id: string;
          org_id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          org_id: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          org_id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_conversations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          role: string;
        };
        ComputedFields: never;
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          role: string;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "ai_conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      alert_events: {
        Row: {
          channel: string;
          created_at: string;
          delivered_at: string | null;
          destination: string;
          error: string | null;
          id: string;
          org_id: string;
          payload: NonNullable<Json>;
          rule_id: string;
          status: string;
          triggered_value: number | null;
        };
        ComputedFields: never;
        Insert: {
          channel: string;
          created_at?: string;
          delivered_at?: string | null;
          destination: string;
          error?: string | null;
          id?: string;
          org_id: string;
          payload?: NonNullable<Json>;
          rule_id: string;
          status?: string;
          triggered_value?: number | null;
        };
        Update: {
          channel?: string;
          created_at?: string;
          delivered_at?: string | null;
          destination?: string;
          error?: string | null;
          id?: string;
          org_id?: string;
          payload?: NonNullable<Json>;
          rule_id?: string;
          status?: string;
          triggered_value?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "alert_events_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alert_events_rule_id_fkey";
            columns: ["rule_id"];
            isOneToOne: false;
            referencedRelation: "alert_rules";
            referencedColumns: ["id"];
          },
        ];
      };
      alert_rules: {
        Row: {
          condition: string;
          cooldown_seconds: number;
          created_at: string;
          created_by: string | null;
          destination: string;
          enabled: boolean;
          id: string;
          kpi: string;
          last_checked_at: string | null;
          last_triggered_at: string | null;
          method: string;
          org_id: string | null;
          threshold: number;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          condition?: string;
          cooldown_seconds?: number;
          created_at?: string;
          created_by?: string | null;
          destination: string;
          enabled?: boolean;
          id?: string;
          kpi: string;
          last_checked_at?: string | null;
          last_triggered_at?: string | null;
          method?: string;
          org_id?: string | null;
          threshold?: number;
          updated_at?: string | null;
        };
        Update: {
          condition?: string;
          cooldown_seconds?: number;
          created_at?: string;
          created_by?: string | null;
          destination?: string;
          enabled?: boolean;
          id?: string;
          kpi?: string;
          last_checked_at?: string | null;
          last_triggered_at?: string | null;
          method?: string;
          org_id?: string | null;
          threshold?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "alert_rules_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      api_keys: {
        Row: {
          created_at: string | null;
          hashed_key: string;
          id: string;
          last_used_at: string | null;
          name: string;
          org_id: string;
          prefix: string;
          revoked_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          hashed_key: string;
          id?: string;
          last_used_at?: string | null;
          name: string;
          org_id: string;
          prefix: string;
          revoked_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          hashed_key?: string;
          id?: string;
          last_used_at?: string | null;
          name?: string;
          org_id?: string;
          prefix?: string;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "api_keys_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_label: string | null;
          created_at: string | null;
          id: string;
          metadata: Json | null;
          org_id: string | null;
          resource: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_label?: string | null;
          created_at?: string | null;
          id?: string;
          metadata?: Json | null;
          org_id?: string | null;
          resource: string;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          actor_label?: string | null;
          created_at?: string | null;
          id?: string;
          metadata?: Json | null;
          org_id?: string | null;
          resource?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      data_sources: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          kind: string;
          last_synced_at: string | null;
          name: string;
          org_id: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind?: string;
          last_synced_at?: string | null;
          name: string;
          org_id: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind?: string;
          last_synced_at?: string | null;
          name?: string;
          org_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "data_sources_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      feature_flags: {
        Row: {
          enabled: boolean;
          flag: string;
          org_id: string;
        };
        ComputedFields: never;
        Insert: {
          enabled: boolean;
          flag: string;
          org_id: string;
        };
        Update: {
          enabled?: boolean;
          flag?: string;
          org_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feature_flags_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      import_jobs: {
        Row: {
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          data_source_id: string | null;
          error_count: number;
          errors: NonNullable<Json>;
          id: string;
          kind: string;
          org_id: string;
          row_count: number;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_source_id?: string | null;
          error_count?: number;
          errors?: NonNullable<Json>;
          id?: string;
          kind: string;
          org_id: string;
          row_count?: number;
          status?: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          data_source_id?: string | null;
          error_count?: number;
          errors?: NonNullable<Json>;
          id?: string;
          kind?: string;
          org_id?: string;
          row_count?: number;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "import_jobs_data_source_id_fkey";
            columns: ["data_source_id"];
            isOneToOne: false;
            referencedRelation: "data_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "import_jobs_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_data: {
        Row: {
          created_at: string;
          id: string;
          org_id: string | null;
          product: string;
          status: string;
          stock: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          org_id?: string | null;
          product: string;
          status?: string;
          stock?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          org_id?: string | null;
          product?: string;
          status?: string;
          stock?: number;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_data_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      kpis: {
        Row: {
          change: string;
          created_at: string;
          id: string;
          org_id: string | null;
          title: string;
          trend: string;
          value: string;
        };
        ComputedFields: never;
        Insert: {
          change?: string;
          created_at?: string;
          id?: string;
          org_id?: string | null;
          title: string;
          trend?: string;
          value?: string;
        };
        Update: {
          change?: string;
          created_at?: string;
          id?: string;
          org_id?: string | null;
          title?: string;
          trend?: string;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kpis_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_invitations: {
        Row: {
          created_at: string | null;
          email: string;
          expires_at: string;
          id: string;
          org_id: string;
          role: string;
          status: string | null;
          token: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          email: string;
          expires_at: string;
          id?: string;
          org_id: string;
          role: string;
          status?: string | null;
          token: string;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          expires_at?: string;
          id?: string;
          org_id?: string;
          role?: string;
          status?: string | null;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_invitations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_members: {
        Row: {
          created_at: string | null;
          org_id: string;
          role: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          org_id: string;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          org_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          cancel_at_period_end: boolean | null;
          created_at: string | null;
          current_period_end: string | null;
          id: string;
          name: string;
          slug: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_plan: string | null;
          subscription_status: string | null;
          updated_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          cancel_at_period_end?: boolean | null;
          created_at?: string | null;
          current_period_end?: string | null;
          id?: string;
          name: string;
          slug: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_plan?: string | null;
          subscription_status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          cancel_at_period_end?: boolean | null;
          created_at?: string | null;
          current_period_end?: string | null;
          id?: string;
          name?: string;
          slug?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_plan?: string | null;
          subscription_status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      sales_data: {
        Row: {
          created_at: string;
          id: string;
          month: string;
          org_id: string | null;
          sales: number;
          target: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          month: string;
          org_id?: string | null;
          sales?: number;
          target?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          month?: string;
          org_id?: string | null;
          sales?: number;
          target?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sales_data_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      stripe_events: {
        Row: {
          id: string;
          processed_at: string;
          type: string;
        };
        ComputedFields: never;
        Insert: {
          id: string;
          processed_at?: string;
          type: string;
        };
        Update: {
          id?: string;
          processed_at?: string;
          type?: string;
        };
        Relationships: [];
      };
      usage_events: {
        Row: {
          created_at: string | null;
          event_type: string;
          id: string;
          org_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string | null;
          event_type: string;
          id?: string;
          org_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          event_type?: string;
          id?: string;
          org_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "usage_events_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      dearmor: { Args: { "": string }; Returns: string };
      gen_random_uuid: { Args: Record<PropertyKey, never>; Returns: string };
      gen_salt: { Args: { "": string }; Returns: string };
      has_org_role: {
        Args: { allowed_roles: string[]; target_org_id: string };
        Returns: boolean;
      };
      is_org_member: { Args: { org_id: string }; Returns: boolean };
      owns_ai_conversation: {
        Args: { target_conversation_id: string };
        Returns: boolean;
      };
      pgp_armor_headers: {
        Args: { "": string };
        Returns: Record<string, unknown>[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
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
    Enums: {},
  },
} as const;
