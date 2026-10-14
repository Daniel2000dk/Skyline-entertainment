export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string;
          actor_id: string | null;
          details: NonNullable<Json>;
          entity_id: string | null;
          entity_type: string;
          id: number;
          occurred_at: string;
          project_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          details?: NonNullable<Json>;
          entity_id?: string | null;
          entity_type: string;
          id?: never;
          occurred_at?: string;
          project_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          details?: NonNullable<Json>;
          entity_id?: string | null;
          entity_type?: string;
          id?: never;
          occurred_at?: string;
          project_id?: string | null;
        };
        Relationships: [];
      };
      attachments: {
        Row: {
          content_type: string;
          created_at: string;
          file_name: string;
          id: string;
          idea_id: string | null;
          project_id: string | null;
          size_bytes: number;
          storage_path: string;
          uploaded_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          content_type: string;
          created_at?: string;
          file_name: string;
          id?: string;
          idea_id?: string | null;
          project_id?: string | null;
          size_bytes: number;
          storage_path: string;
          uploaded_by?: string | null;
        };
        Update: {
          content_type?: string;
          created_at?: string;
          file_name?: string;
          id?: string;
          idea_id?: string | null;
          project_id?: string | null;
          size_bytes?: number;
          storage_path?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "attachments_idea_id_fkey";
            columns: ["idea_id"];
            isOneToOne: false;
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attachments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      checklist_items: {
        Row: {
          created_at: string;
          done_at: string | null;
          done_by: string | null;
          id: string;
          is_done: boolean;
          position: number;
          project_id: string;
          task_id: string | null;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          done_at?: string | null;
          done_by?: string | null;
          id?: string;
          is_done?: boolean;
          position?: number;
          project_id: string;
          task_id?: string | null;
          title: string;
        };
        Update: {
          created_at?: string;
          done_at?: string | null;
          done_by?: string | null;
          id?: string;
          is_done?: boolean;
          position?: number;
          project_id?: string;
          task_id?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checklist_items_done_by_fkey";
            columns: ["done_by"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checklist_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checklist_items_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          author_id: string | null;
          body: string;
          created_at: string;
          deleted_at: string | null;
          edited_at: string | null;
          id: string;
          idea_id: string | null;
          parent_id: string | null;
          project_id: string | null;
          suggestion_id: string | null;
          task_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          author_id?: string | null;
          body: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          idea_id?: string | null;
          parent_id?: string | null;
          project_id?: string | null;
          suggestion_id?: string | null;
          task_id?: string | null;
        };
        Update: {
          author_id?: string | null;
          body?: string;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          idea_id?: string | null;
          parent_id?: string | null;
          project_id?: string | null;
          suggestion_id?: string | null;
          task_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_idea_id_fkey";
            columns: ["idea_id"];
            isOneToOne: false;
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_suggestion_id_fkey";
            columns: ["suggestion_id"];
            isOneToOne: false;
            referencedRelation: "suggestions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      content_revisions: {
        Row: {
          changed_at: string;
          changed_by: string | null;
          changed_columns: string[];
          entity: string;
          id: number;
          previous: NonNullable<Json>;
          project_id: string;
        };
        ComputedFields: never;
        Insert: {
          changed_at?: string;
          changed_by?: string | null;
          changed_columns: string[];
          entity: string;
          id?: never;
          previous: NonNullable<Json>;
          project_id: string;
        };
        Update: {
          changed_at?: string;
          changed_by?: string | null;
          changed_columns?: string[];
          entity?: string;
          id?: never;
          previous?: NonNullable<Json>;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_revisions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      event_types: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          capacity: number | null;
          created_at: string;
          description: string | null;
          ends_at: string | null;
          entry_fee_gta: number;
          id: string;
          location: string | null;
          project_id: string;
          registration_mode: Database["public"]["Enums"]["registration_mode"];
          rules: string | null;
          slug: string;
          starts_at: string | null;
          summary: string | null;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          capacity?: number | null;
          created_at?: string;
          description?: string | null;
          ends_at?: string | null;
          entry_fee_gta?: number;
          id?: string;
          location?: string | null;
          project_id: string;
          registration_mode?: Database["public"]["Enums"]["registration_mode"];
          rules?: string | null;
          slug: string;
          starts_at?: string | null;
          summary?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          capacity?: number | null;
          created_at?: string;
          description?: string | null;
          ends_at?: string | null;
          entry_fee_gta?: number;
          id?: string;
          location?: string | null;
          project_id?: string;
          registration_mode?: Database["public"]["Enums"]["registration_mode"];
          rules?: string | null;
          slug?: string;
          starts_at?: string | null;
          summary?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      idea_votes: {
        Row: {
          created_at: string;
          idea_id: string;
          staff_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          idea_id: string;
          staff_id?: string;
        };
        Update: {
          created_at?: string;
          idea_id?: string;
          staff_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "idea_votes_idea_id_fkey";
            columns: ["idea_id"];
            isOneToOne: false;
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "idea_votes_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ideas: {
        Row: {
          author_id: string | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          description: string | null;
          id: string;
          project_id: string | null;
          status: Database["public"]["Enums"]["idea_status"];
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          author_id?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          description?: string | null;
          id?: string;
          project_id?: string | null;
          status?: Database["public"]["Enums"]["idea_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          description?: string | null;
          id?: string;
          project_id?: string | null;
          status?: Database["public"]["Enums"]["idea_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ideas_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ideas_decided_by_fkey";
            columns: ["decided_by"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ideas_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_members: {
        Row: {
          added_by: string | null;
          created_at: string;
          permission: Database["public"]["Enums"]["project_permission"];
          project_id: string;
          staff_id: string;
        };
        ComputedFields: never;
        Insert: {
          added_by?: string | null;
          created_at?: string;
          permission?: Database["public"]["Enums"]["project_permission"];
          project_id: string;
          staff_id: string;
        };
        Update: {
          added_by?: string | null;
          created_at?: string;
          permission?: Database["public"]["Enums"]["project_permission"];
          project_id?: string;
          staff_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_members_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_members_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          budget_gta: number;
          created_at: string;
          created_by: string | null;
          description: string | null;
          event_type_id: string | null;
          id: string;
          owner_id: string;
          status: Database["public"]["Enums"]["project_status"];
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          budget_gta?: number;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          event_type_id?: string | null;
          id?: string;
          owner_id: string;
          status?: Database["public"]["Enums"]["project_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          budget_gta?: number;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          event_type_id?: string | null;
          id?: string;
          owner_id?: string;
          status?: Database["public"]["Enums"]["project_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_event_type_id_fkey";
            columns: ["event_type_id"];
            isOneToOne: false;
            referencedRelation: "event_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      runbook_items: {
        Row: {
          created_at: string;
          details: string | null;
          id: string;
          position: number;
          project_id: string;
          responsible_id: string | null;
          starts_at: string | null;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          details?: string | null;
          id?: string;
          position?: number;
          project_id: string;
          responsible_id?: string | null;
          starts_at?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          id?: string;
          position?: number;
          project_id?: string;
          responsible_id?: string | null;
          starts_at?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "runbook_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "runbook_items_responsible_id_fkey";
            columns: ["responsible_id"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_invitations: {
        Row: {
          claimed_at: string | null;
          created_at: string;
          display_name: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string | null;
          revoked_at: string | null;
          role: Database["public"]["Enums"]["staff_role"];
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          claimed_at?: string | null;
          created_at?: string;
          display_name: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          revoked_at?: string | null;
          role?: Database["public"]["Enums"]["staff_role"];
          user_id?: string | null;
        };
        Update: {
          claimed_at?: string | null;
          created_at?: string;
          display_name?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          revoked_at?: string | null;
          role?: Database["public"]["Enums"]["staff_role"];
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "staff_invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          invited_by: string | null;
          is_active: boolean;
          role: Database["public"]["Enums"]["staff_role"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name: string;
          id: string;
          invited_by?: string | null;
          is_active?: boolean;
          role?: Database["public"]["Enums"]["staff_role"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          invited_by?: string | null;
          is_active?: boolean;
          role?: Database["public"]["Enums"]["staff_role"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_profiles_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      suggestions: {
        Row: {
          author_id: string | null;
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          decision_note: string | null;
          field: string | null;
          id: string;
          message: string;
          project_id: string;
          proposed_value: string | null;
          status: Database["public"]["Enums"]["suggestion_status"];
        };
        ComputedFields: never;
        Insert: {
          author_id?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          decision_note?: string | null;
          field?: string | null;
          id?: string;
          message: string;
          project_id: string;
          proposed_value?: string | null;
          status?: Database["public"]["Enums"]["suggestion_status"];
        };
        Update: {
          author_id?: string | null;
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          decision_note?: string | null;
          field?: string | null;
          id?: string;
          message?: string;
          project_id?: string;
          proposed_value?: string | null;
          status?: Database["public"]["Enums"]["suggestion_status"];
        };
        Relationships: [
          {
            foreignKeyName: "suggestions_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "suggestions_decided_by_fkey";
            columns: ["decided_by"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "suggestions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      task_templates: {
        Row: {
          created_at: string;
          days_before_event: number;
          description: string | null;
          event_type_id: string;
          id: string;
          position: number;
          priority: Database["public"]["Enums"]["task_priority"];
          title: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          days_before_event?: number;
          description?: string | null;
          event_type_id: string;
          id?: string;
          position?: number;
          priority?: Database["public"]["Enums"]["task_priority"];
          title: string;
        };
        Update: {
          created_at?: string;
          days_before_event?: number;
          description?: string | null;
          event_type_id?: string;
          id?: string;
          position?: number;
          priority?: Database["public"]["Enums"]["task_priority"];
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_templates_event_type_id_fkey";
            columns: ["event_type_id"];
            isOneToOne: false;
            referencedRelation: "event_types";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          assignee_id: string | null;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          due_at: string | null;
          id: string;
          position: number;
          priority: Database["public"]["Enums"]["task_priority"];
          project_id: string;
          status: Database["public"]["Enums"]["task_status"];
          template_id: string | null;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          assignee_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          due_at?: string | null;
          id?: string;
          position?: number;
          priority?: Database["public"]["Enums"]["task_priority"];
          project_id: string;
          status?: Database["public"]["Enums"]["task_status"];
          template_id?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          assignee_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          due_at?: string | null;
          id?: string;
          position?: number;
          priority?: Database["public"]["Enums"]["task_priority"];
          project_id?: string;
          status?: Database["public"]["Enums"]["task_status"];
          template_id?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "task_templates";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      consume_rate_limit: {
        Args: { limit_key: string; max_hits: number; window_seconds: number };
        Returns: boolean;
      };
      convert_idea_to_project: {
        Args: { p_event_type_id?: string; p_idea_id: string };
        Returns: string;
      };
      create_event_project: {
        Args: {
          p_description?: string;
          p_event_type_id?: string;
          p_starts_at?: string;
          p_title: string;
        };
        Returns: string;
      };
      decide_suggestion: {
        Args: { p_accept: boolean; p_note?: string; p_suggestion_id: string };
        Returns: undefined;
      };
      log_security_event: {
        Args: { security_event: string; target_staff_id: string };
        Returns: undefined;
      };
      my_editable_project_ids: { Args: Record<PropertyKey, never>; Returns: string[] };
      revert_content_revision: { Args: { p_revision_id: number }; Returns: undefined };
      staff_with_mfa: { Args: Record<PropertyKey, never>; Returns: string[] };
      update_event_project: {
        Args: {
          p_budget_gta: number;
          p_capacity: number;
          p_description: string;
          p_ends_at: string;
          p_entry_fee_gta: number;
          p_event_type_id: string;
          p_location: string;
          p_project_id: string;
          p_registration_mode: Database["public"]["Enums"]["registration_mode"];
          p_rules: string;
          p_starts_at: string;
          p_summary: string;
          p_title: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      idea_status: "new" | "discussing" | "approved" | "rejected" | "converted";
      project_permission: "editor" | "commenter";
      project_status:
        | "idea"
        | "under_review"
        | "approved"
        | "in_preparation"
        | "published"
        | "completed"
        | "archived"
        | "cancelled";
      registration_mode: "closed" | "open" | "approval";
      staff_role: "admin" | "organizer" | "team_member";
      suggestion_status: "open" | "accepted" | "rejected" | "withdrawn";
      task_priority: "low" | "normal" | "high" | "urgent";
      task_status: "todo" | "in_progress" | "done";
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      idea_status: ["new", "discussing", "approved", "rejected", "converted"],
      project_permission: ["editor", "commenter"],
      project_status: [
        "idea",
        "under_review",
        "approved",
        "in_preparation",
        "published",
        "completed",
        "archived",
        "cancelled",
      ],
      registration_mode: ["closed", "open", "approval"],
      staff_role: ["admin", "organizer", "team_member"],
      suggestion_status: ["open", "accepted", "rejected", "withdrawn"],
      task_priority: ["low", "normal", "high", "urgent"],
      task_status: ["todo", "in_progress", "done"],
    },
  },
} as const;
