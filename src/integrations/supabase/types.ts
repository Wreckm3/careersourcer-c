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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      team_invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          invitee_email: string | null
          invitee_id: string | null
          responded_at: string | null
          status: Database["public"]["Enums"]["team_invitation_status"]
          team_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          invited_by: string
          invitee_email?: string | null
          invitee_id?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["team_invitation_status"]
          team_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invitee_email?: string | null
          invitee_id?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["team_invitation_status"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_join_requests: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          requester_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["team_join_request_status"]
          team_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          requester_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["team_join_request_status"]
          team_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          requester_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["team_join_request_status"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_join_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          joined_at: string
          role: Database["public"]["Enums"]["team_member_role"]
          status: Database["public"]["Enums"]["team_membership_status"]
          team_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          role: Database["public"]["Enums"]["team_member_role"]
          status?: Database["public"]["Enums"]["team_membership_status"]
          team_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          role?: Database["public"]["Enums"]["team_member_role"]
          status?: Database["public"]["Enums"]["team_membership_status"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_rate_limit_guards: {
        Row: {
          operation: string
          touched_at: string
          user_id: string
        }
        Insert: {
          operation: string
          touched_at?: string
          user_id: string
        }
        Update: {
          operation?: string
          touched_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_projects: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          name: string
          objectives: string
          status: Database["public"]["Enums"]["team_project_status"]
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          id?: string
          name: string
          objectives?: string
          status?: Database["public"]["Enums"]["team_project_status"]
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          name?: string
          objectives?: string
          status?: Database["public"]["Enums"]["team_project_status"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_projects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_project_milestones: {
        Row: {
          created_at: string
          created_by: string
          description: string
          due_at: string | null
          id: string
          project_id: string
          status: Database["public"]["Enums"]["team_project_milestone_status"]
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          due_at?: string | null
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["team_project_milestone_status"]
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          due_at?: string | null
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["team_project_milestone_status"]
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_project_milestones_team_id_project_id_fkey"
            columns: ["team_id", "project_id"]
            isOneToOne: false
            referencedRelation: "team_projects"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      team_project_tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string
          due_at: string | null
          id: string
          priority: Database["public"]["Enums"]["team_project_task_priority"]
          project_id: string
          status: Database["public"]["Enums"]["team_project_task_status"]
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string
          due_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["team_project_task_priority"]
          project_id: string
          status?: Database["public"]["Enums"]["team_project_task_status"]
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string
          due_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["team_project_task_priority"]
          project_id?: string
          status?: Database["public"]["Enums"]["team_project_task_status"]
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_project_tasks_team_id_project_id_fkey"
            columns: ["team_id", "project_id"]
            isOneToOne: false
            referencedRelation: "team_projects"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "team_project_tasks_team_id_assignee_id_fkey"
            columns: ["team_id", "assignee_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["team_id", "user_id"]
          },
        ]
      }
      team_project_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          project_id: string
          team_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          project_id: string
          team_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          project_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_project_messages_team_id_project_id_fkey"
            columns: ["team_id", "project_id"]
            isOneToOne: false
            referencedRelation: "team_projects"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      team_project_resources: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          project_id: string
          resource_type: string
          resource_url: string | null
          storage_path: string | null
          team_id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          id?: string
          project_id: string
          resource_type: string
          resource_url?: string | null
          storage_path?: string | null
          team_id: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          project_id?: string
          resource_type?: string
          resource_url?: string | null
          storage_path?: string | null
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_project_resources_team_id_project_id_fkey"
            columns: ["team_id", "project_id"]
            isOneToOne: false
            referencedRelation: "team_projects"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      team_project_activity: {
        Row: {
          activity_type: string
          actor_id: string | null
          created_at: string
          details: Json
          id: number
          project_id: string | null
          target_id: string | null
          team_id: string
        }
        Insert: {
          activity_type: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: number
          project_id?: string | null
          target_id?: string | null
          team_id: string
        }
        Update: {
          activity_type?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: number
          project_id?: string | null
          target_id?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_project_activity_team_id_project_id_fkey"
            columns: ["team_id", "project_id"]
            isOneToOne: false
            referencedRelation: "team_projects"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      team_project_contributions: {
        Row: {
          contributor_id: string
          created_at: string
          evidence: string
          id: string
          project_id: string
          review_notes: string
          reviewed_at: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["team_contribution_status"]
          studyflow_branch_id: string | null
          studyflow_item_id: string | null
          summary: string
          task_id: string
          team_id: string
        }
        Insert: {
          contributor_id: string
          created_at?: string
          evidence: string
          id?: string
          project_id: string
          review_notes?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["team_contribution_status"]
          studyflow_branch_id?: string | null
          studyflow_item_id?: string | null
          summary: string
          task_id: string
          team_id: string
        }
        Update: {
          contributor_id?: string
          created_at?: string
          evidence?: string
          id?: string
          project_id?: string
          review_notes?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["team_contribution_status"]
          studyflow_branch_id?: string | null
          studyflow_item_id?: string | null
          summary?: string
          task_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_project_contributions_team_id_project_id_task_id_fkey"
            columns: ["team_id", "project_id", "task_id"]
            isOneToOne: false
            referencedRelation: "team_project_tasks"
            referencedColumns: ["team_id", "project_id", "id"]
          },
        ]
      }
      team_contribution_portfolio: {
        Row: {
          consented_at: string
          contribution_id: string
          evidence_snapshot: string
          title_snapshot: string
          user_id: string
        }
        Insert: {
          consented_at?: string
          contribution_id: string
          evidence_snapshot: string
          title_snapshot: string
          user_id: string
        }
        Update: {
          consented_at?: string
          contribution_id?: string
          evidence_snapshot?: string
          title_snapshot?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_contribution_portfolio_contribution_id_user_id_fkey"
            columns: ["contribution_id", "user_id"]
            isOneToOne: true
            referencedRelation: "team_project_contributions"
            referencedColumns: ["id", "contributor_id"]
          },
        ]
      }
      teams: {
        Row: {
          collaboration_version: number
          created_at: string
          created_by: string | null
          id: string
          is_discoverable: boolean
          name: string
        }
        Insert: {
          collaboration_version?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_discoverable?: boolean
          name: string
        }
        Update: {
          collaboration_version?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_discoverable?: boolean
          name?: string
        }
        Relationships: []
      }
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
      atlas_study_profiles: {
        Row: {
          profile: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          profile?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          profile?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      atlas_studyflows: {
        Row: {
          active_roadmap: Json | null
          branch_id: string
          proposal_id: string | null
          proposed_roadmap: Json | null
          roadmap_history: Json
          revision: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_roadmap?: Json | null
          branch_id: string
          proposal_id?: string | null
          proposed_roadmap?: Json | null
          roadmap_history?: Json
          revision?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_roadmap?: Json | null
          branch_id?: string
          proposal_id?: string | null
          proposed_roadmap?: Json | null
          roadmap_history?: Json
          revision?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      atlas_studyflow_evidence: {
        Row: {
          branch_id: string
          created_at: string
          evidence_text: string
          id: string
          item_id: string
          roadmap_revision: number
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          evidence_text: string
          id?: string
          item_id: string
          roadmap_revision: number
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          evidence_text?: string
          id?: string
          item_id?: string
          roadmap_revision?: number
          user_id?: string
        }
        Relationships: []
      }
      atlas_studyflow_assessments: {
        Row: {
          branch_id: string
          created_at: string
          criteria_met: string[]
          decision: string
          evidence_id: string
          feedback: string
          id: string
          next_step: string
          remaining_gaps: string[]
          roadmap_revision: number
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          criteria_met?: string[]
          decision: string
          evidence_id: string
          feedback: string
          id?: string
          next_step: string
          remaining_gaps?: string[]
          roadmap_revision: number
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          criteria_met?: string[]
          decision?: string
          evidence_id?: string
          feedback?: string
          id?: string
          next_step?: string
          remaining_gaps?: string[]
          roadmap_revision?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atlas_studyflow_assessments_user_id_evidence_id_fkey"
            columns: ["user_id", "evidence_id"]
            isOneToOne: false
            referencedRelation: "atlas_studyflow_evidence"
            referencedColumns: ["user_id", "id"]
          },
        ]
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
      accept_team_invitation: {
        Args: { _invitation_id: string }
        Returns: string
      }
      approve_team_join_request: {
        Args: { _request_id: string }
        Returns: string
      }
      create_team: {
        Args: { _is_discoverable?: boolean; _name: string }
        Returns: string
      }
      create_team_invitation: {
        Args: { _invitee_id: string; _team_id: string }
        Returns: string
      }
      decline_team_invitation: {
        Args: { _invitation_id: string }
        Returns: undefined
      }
      decline_team_join_request: {
        Args: { _request_id: string }
        Returns: undefined
      }
      delete_team: {
        Args: { _team_id: string }
        Returns: undefined
      }
      get_user_tier: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["subscription_tier"]
      }
      atlas_founder_control_snapshot: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      atlas_founder_pause_generation: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      has_founder_atlas_entitlement: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      atlas_approve_studyflow_proposal: {
        Args: { _branch_id: string }
        Returns: Database["public"]["Tables"]["atlas_studyflows"]["Row"]
      }
      atlas_studyflow_mastery_snapshot: {
        Args: { _branch_id: string; _revision: number }
        Returns: Json
      }
      atlas_submit_studyflow_evidence: {
        Args: { _branch_id: string; _evidence_text: string; _item_id: string }
        Returns: string
      }
      can_manage_team_project: {
        Args: { _project_id: string }
        Returns: boolean
      }
      can_delete_team_attachment: {
        Args: { _name: string }
        Returns: boolean
      }
      claim_team_project_task: {
        Args: { _task_id: string }
        Returns: undefined
      }
      create_team_invitation_by_email: {
        Args: { _invitee_email: string; _team_id: string }
        Returns: string
      }
      create_team_project: {
        Args: {
          _description?: string
          _name: string
          _objectives?: string
          _team_id: string
        }
        Returns: string
      }
      create_team_project_milestone: {
        Args: {
          _description?: string
          _due_at?: string | null
          _project_id: string
          _title: string
        }
        Returns: string
      }
      create_team_project_resource: {
        Args: {
          _description: string
          _project_id: string
          _resource_type: string
          _resource_url: string | null
          _storage_path: string | null
          _title: string
        }
        Returns: string
      }
      create_team_project_task: {
        Args: {
          _assignee_id?: string | null
          _description?: string
          _due_at?: string | null
          _priority?: Database["public"]["Enums"]["team_project_task_priority"]
          _project_id: string
          _title: string
        }
        Returns: string
      }
      is_team_attachment_path: {
        Args: { _name: string }
        Returns: boolean
      }
      is_active_team_member: {
        Args: { _team_id: string }
        Returns: boolean
      }
      is_team_manager: {
        Args: { _team_id: string }
        Returns: boolean
      }
      leave_team: {
        Args: { _team_id: string }
        Returns: undefined
      }
      remove_team_member: {
        Args: { _member_id: string; _team_id: string }
        Returns: undefined
      }
      request_to_join_team: {
        Args: { _team_id: string }
        Returns: string
      }
      revoke_team_invitation: {
        Args: { _invitation_id: string }
        Returns: undefined
      }
      set_team_member_role: {
        Args: {
          _member_id: string
          _role: Database["public"]["Enums"]["team_member_role"]
          _team_id: string
        }
        Returns: undefined
      }
      set_team_project_task_status: {
        Args: {
          _status: Database["public"]["Enums"]["team_project_task_status"]
          _task_id: string
        }
        Returns: undefined
      }
      set_team_contribution_portfolio_consent: {
        Args: { _consent: boolean; _contribution_id: string }
        Returns: undefined
      }
      send_team_project_message: {
        Args: { _body: string; _project_id: string }
        Returns: string
      }
      submit_team_project_contribution: {
        Args: {
          _evidence: string
          _studyflow_item_id?: string
          _summary: string
          _task_id: string
        }
        Returns: string
      }
      review_team_project_contribution: {
        Args: {
          _approve: boolean
          _contribution_id: string
          _review_notes?: string
        }
        Returns: undefined
      }
      update_team: {
        Args: { _is_discoverable: boolean; _name: string; _team_id: string }
        Returns: undefined
      }
      update_team_project: {
        Args: {
          _description: string
          _name: string
          _objectives: string
          _project_id: string
          _status: Database["public"]["Enums"]["team_project_status"]
        }
        Returns: undefined
      }
      update_team_project_milestone: {
        Args: {
          _description: string
          _due_at: string | null
          _milestone_id: string
          _status: Database["public"]["Enums"]["team_project_milestone_status"]
          _title: string
        }
        Returns: undefined
      }
      update_team_project_task_details: {
        Args: {
          _assignee_id: string | null
          _description: string
          _due_at: string | null
          _priority: Database["public"]["Enums"]["team_project_task_priority"]
          _task_id: string
          _title: string
        }
        Returns: undefined
      }
      transfer_team_ownership: {
        Args: { _new_owner_id: string; _team_id: string }
        Returns: undefined
      }
      withdraw_team_join_request: {
        Args: { _request_id: string }
        Returns: undefined
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
      subscription_tier: "free" | "builder" | "creator" | "visionary"
      upload_review_status: "pending" | "reviewing" | "reviewed" | "rejected"
      team_invitation_status: "pending" | "accepted" | "declined" | "revoked" | "expired"
      team_join_request_status: "pending" | "approved" | "declined" | "withdrawn" | "expired"
      team_member_role: "owner" | "admin" | "member"
      team_membership_status: "active" | "left" | "removed"
      team_project_status: "planning" | "active" | "on_hold" | "completed" | "archived"
      team_project_milestone_status: "pending" | "in_progress" | "completed"
      team_project_task_status: "todo" | "in_progress" | "blocked" | "completed"
      team_project_task_priority: "low" | "normal" | "high" | "urgent"
      team_contribution_status: "pending" | "approved" | "disputed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      subscription_tier: ["free", "builder", "creator", "visionary"],
      upload_review_status: ["pending", "reviewing", "reviewed", "rejected"],
      team_invitation_status: ["pending", "accepted", "declined", "revoked", "expired"],
      team_join_request_status: ["pending", "approved", "declined", "withdrawn", "expired"],
      team_member_role: ["owner", "admin", "member"],
      team_membership_status: ["active", "left", "removed"],
    },
  },
} as const
