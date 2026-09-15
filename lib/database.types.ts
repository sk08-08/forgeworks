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
      atlas_collection_entries: {
        Row: {
          collection_id: string
          created_at: string
          entry_id: string
          sort_order: number
        }
        Insert: {
          collection_id: string
          created_at?: string
          entry_id: string
          sort_order?: number
        }
        Update: {
          collection_id?: string
          created_at?: string
          entry_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "atlas_collection_entries_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "atlas_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atlas_collection_entries_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "atlas_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      atlas_collections: {
        Row: {
          accent_color: string | null
          created_at: string
          deleted_at: string | null
          description: string
          icon_name: string | null
          id: string
          metadata: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          icon_name?: string | null
          id?: string
          metadata?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          icon_name?: string | null
          id?: string
          metadata?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      atlas_entries: {
        Row: {
          aliases: string[]
          content: string
          created_at: string
          deleted_at: string | null
          entry_type: string
          id: string
          metadata: Json
          source_format: string | null
          source_metadata: Json
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aliases?: string[]
          content?: string
          created_at?: string
          deleted_at?: string | null
          entry_type?: string
          id?: string
          metadata?: Json
          source_format?: string | null
          source_metadata?: Json
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aliases?: string[]
          content?: string
          created_at?: string
          deleted_at?: string | null
          entry_type?: string
          id?: string
          metadata?: Json
          source_format?: string | null
          source_metadata?: Json
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      atlas_entry_bots: {
        Row: {
          bot_id: string
          created_at: string
          entry_id: string
          sort_order: number
        }
        Insert: {
          bot_id: string
          created_at?: string
          entry_id: string
          sort_order?: number
        }
        Update: {
          bot_id?: string
          created_at?: string
          entry_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "atlas_entry_bots_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "active_bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atlas_entry_bots_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atlas_entry_bots_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "atlas_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      atlas_entry_property_values: {
        Row: {
          created_at: string
          entry_id: string
          property_definition_id: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          entry_id: string
          property_definition_id: string
          updated_at?: string
          user_id: string
          value?: Json
        }
        Update: {
          created_at?: string
          entry_id?: string
          property_definition_id?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "atlas_entry_property_values_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "atlas_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atlas_entry_property_values_property_definition_id_fkey"
            columns: ["property_definition_id"]
            isOneToOne: false
            referencedRelation: "atlas_property_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      atlas_lorebook_entries: {
        Row: {
          activation: Json
          adapter_metadata: Json
          created_at: string
          enabled: boolean
          entry_id: string
          insertion: Json
          lorebook_id: string
          probability: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          activation?: Json
          adapter_metadata?: Json
          created_at?: string
          enabled?: boolean
          entry_id: string
          insertion?: Json
          lorebook_id: string
          probability?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          activation?: Json
          adapter_metadata?: Json
          created_at?: string
          enabled?: boolean
          entry_id?: string
          insertion?: Json
          lorebook_id?: string
          probability?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atlas_lorebook_entries_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "atlas_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atlas_lorebook_entries_lorebook_id_fkey"
            columns: ["lorebook_id"]
            isOneToOne: false
            referencedRelation: "atlas_lorebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      atlas_lorebooks: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string
          format_version: number
          id: string
          metadata: Json
          source_format: string | null
          source_metadata: Json
          summary: string
          title: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string
          format_version?: number
          id?: string
          metadata?: Json
          source_format?: string | null
          source_metadata?: Json
          summary?: string
          title: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string
          format_version?: number
          id?: string
          metadata?: Json
          source_format?: string | null
          source_metadata?: Json
          summary?: string
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      atlas_property_definitions: {
        Row: {
          created_at: string
          id: string
          key: string
          name: string
          options: Json
          sort_order: number
          updated_at: string
          user_id: string
          value_type: string
          world_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          name: string
          options?: Json
          sort_order?: number
          updated_at?: string
          user_id: string
          value_type: string
          world_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          name?: string
          options?: Json
          sort_order?: number
          updated_at?: string
          user_id?: string
          value_type?: string
          world_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atlas_property_definitions_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "atlas_worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      atlas_relations: {
        Row: {
          created_at: string
          id: string
          inverse_label: string | null
          label: string | null
          metadata: Json
          relation_type: string
          source_entry_id: string
          target_entry_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inverse_label?: string | null
          label?: string | null
          metadata?: Json
          relation_type: string
          source_entry_id: string
          target_entry_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inverse_label?: string | null
          label?: string | null
          metadata?: Json
          relation_type?: string
          source_entry_id?: string
          target_entry_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atlas_relations_source_entry_id_fkey"
            columns: ["source_entry_id"]
            isOneToOne: false
            referencedRelation: "atlas_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atlas_relations_target_entry_id_fkey"
            columns: ["target_entry_id"]
            isOneToOne: false
            referencedRelation: "atlas_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      atlas_world_bots: {
        Row: {
          bot_id: string
          created_at: string
          sort_order: number
          world_id: string
        }
        Insert: {
          bot_id: string
          created_at?: string
          sort_order?: number
          world_id: string
        }
        Update: {
          bot_id?: string
          created_at?: string
          sort_order?: number
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_bot"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "active_bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bot"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_world"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "atlas_worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      atlas_world_entries: {
        Row: {
          created_at: string
          entry_id: string
          sort_order: number
          world_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          sort_order?: number
          world_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          sort_order?: number
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atlas_world_entries_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "atlas_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atlas_world_entries_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "atlas_worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      atlas_worlds: {
        Row: {
          accent_color: string | null
          cover_url: string | null
          created_at: string
          deleted_at: string | null
          description: string
          icon_name: string | null
          id: string
          lore_summary: string
          metadata: Json
          slug: string
          title: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          accent_color?: string | null
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          icon_name?: string | null
          id?: string
          lore_summary?: string
          metadata?: Json
          slug: string
          title: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          accent_color?: string | null
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          icon_name?: string | null
          id?: string
          lore_summary?: string
          metadata?: Json
          slug?: string
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      badge_definitions: {
        Row: {
          category: string
          color: string
          created_at: string
          description: string | null
          emoji: string | null
          group_key: string | null
          icon: string
          image_url: string | null
          is_active: boolean
          is_manual_only: boolean
          is_system: boolean
          label: string
          metadata: Json
          rarity: string
          slug: string
          sort_order: number
          updated_at: string
          visibility: string
        }
        Insert: {
          category?: string
          color?: string
          created_at?: string
          description?: string | null
          emoji?: string | null
          group_key?: string | null
          icon?: string
          image_url?: string | null
          is_active?: boolean
          is_manual_only?: boolean
          is_system?: boolean
          label: string
          metadata?: Json
          rarity?: string
          slug: string
          sort_order?: number
          updated_at?: string
          visibility?: string
        }
        Update: {
          category?: string
          color?: string
          created_at?: string
          description?: string | null
          emoji?: string | null
          group_key?: string | null
          icon?: string
          image_url?: string | null
          is_active?: boolean
          is_manual_only?: boolean
          is_system?: boolean
          label?: string
          metadata?: Json
          rarity?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          blocked_at: string
          form_id: string
          id: string
          ip_address: string
          reason: string
        }
        Insert: {
          blocked_at?: string
          form_id: string
          id?: string
          ip_address: string
          reason: string
        }
        Update: {
          blocked_at?: string
          form_id?: string
          id?: string
          ip_address?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_ips_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "active_request_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_ips_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "request_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_activity_log: {
        Row: {
          action: string
          bot_id: string
          created_at: string
          details: Json
          id: string
          user_id: string
        }
        Insert: {
          action: string
          bot_id: string
          created_at?: string
          details?: Json
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          bot_id?: string
          created_at?: string
          details?: Json
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_activity_log_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "active_bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_activity_log_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_change_requests: {
        Row: {
          author_id: string
          base_version_id: string | null
          bot_id: string
          changes_requested_at: string | null
          changes_requested_by: string | null
          created_at: string
          description: string | null
          id: string
          proposed_changes: Json
          rejection_reason: string | null
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          base_version_id?: string | null
          bot_id: string
          changes_requested_at?: string | null
          changes_requested_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          proposed_changes?: Json
          rejection_reason?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          base_version_id?: string | null
          bot_id?: string
          changes_requested_at?: string | null
          changes_requested_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          proposed_changes?: Json
          rejection_reason?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_change_requests_base_version_id_fkey"
            columns: ["base_version_id"]
            isOneToOne: false
            referencedRelation: "bot_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_change_requests_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "active_bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_change_requests_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_collaboration_locks: {
        Row: {
          acquired_at: string
          bot_id: string
          expires_at: string
          field_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          bot_id: string
          expires_at: string
          field_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          bot_id?: string
          expires_at?: string
          field_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_collaboration_locks_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "active_bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_collaboration_locks_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_collaborators: {
        Row: {
          bot_id: string
          created_at: string
          expires_at: string | null
          id: string
          invite_message: string | null
          invited_by: string
          responded_at: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bot_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          invite_message?: string | null
          invited_by: string
          responded_at?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bot_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          invite_message?: string | null
          invited_by?: string
          responded_at?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_collaborators_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "active_bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_collaborators_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_comments: {
        Row: {
          bot_id: string
          content: string
          context_key: string | null
          context_type: string | null
          created_at: string
          id: string
          parent_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bot_id: string
          content: string
          context_key?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          parent_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bot_id?: string
          content?: string
          context_key?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          parent_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_comments_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "active_bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_comments_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "bot_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_forks: {
        Row: {
          created_at: string
          fork_reason: string | null
          forked_bot_id: string
          forked_by: string
          id: string
          original_bot_id: string
        }
        Insert: {
          created_at?: string
          fork_reason?: string | null
          forked_bot_id: string
          forked_by: string
          id?: string
          original_bot_id: string
        }
        Update: {
          created_at?: string
          fork_reason?: string | null
          forked_bot_id?: string
          forked_by?: string
          id?: string
          original_bot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_forks_forked_bot_id_fkey"
            columns: ["forked_bot_id"]
            isOneToOne: false
            referencedRelation: "active_bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_forks_forked_bot_id_fkey"
            columns: ["forked_bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_forks_original_bot_id_fkey"
            columns: ["original_bot_id"]
            isOneToOne: false
            referencedRelation: "active_bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_forks_original_bot_id_fkey"
            columns: ["original_bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_versions: {
        Row: {
          bot_id: string
          change_request_id: string | null
          changed_fields: string[]
          created_at: string
          created_by: string | null
          id: string
          restored_from_version_id: string | null
          snapshot: Json
          source: string
          version_number: number
        }
        Insert: {
          bot_id: string
          change_request_id?: string | null
          changed_fields?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          restored_from_version_id?: string | null
          snapshot: Json
          source?: string
          version_number: number
        }
        Update: {
          bot_id?: string
          change_request_id?: string | null
          changed_fields?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          restored_from_version_id?: string | null
          snapshot?: Json
          source?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "bot_versions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "active_bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_versions_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_versions_change_request_id_fkey"
            columns: ["change_request_id"]
            isOneToOne: false
            referencedRelation: "bot_change_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_versions_restored_from_version_id_fkey"
            columns: ["restored_from_version_id"]
            isOneToOne: false
            referencedRelation: "bot_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      bots: {
        Row: {
          alternate_greetings: string[]
          chat_name: string | null
          created_at: string
          deleted_at: string | null
          example_dialogues: string
          first_message: string
          hide_sensitive_fields: boolean
          id: string
          image_url: string | null
          name: string
          personality: string
          rating: string
          require_collab_approval: boolean | null
          scenario: string
          short_description: string
          tags: string[]
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          alternate_greetings?: string[]
          chat_name?: string | null
          created_at?: string
          deleted_at?: string | null
          example_dialogues?: string
          first_message: string
          hide_sensitive_fields?: boolean
          id?: string
          image_url?: string | null
          name: string
          personality: string
          rating?: string
          require_collab_approval?: boolean | null
          scenario?: string
          short_description: string
          tags?: string[]
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          alternate_greetings?: string[]
          chat_name?: string | null
          created_at?: string
          deleted_at?: string | null
          example_dialogues?: string
          first_message?: string
          hide_sensitive_fields?: boolean
          id?: string
          image_url?: string | null
          name?: string
          personality?: string
          rating?: string
          require_collab_approval?: boolean | null
          scenario?: string
          short_description?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      creator_page_sections: {
        Row: {
          config: Json
          created_at: string
          deleted_at: string | null
          id: string
          kind: string
          page_id: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          kind: string
          page_id: string
          position?: number
          title?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          kind?: string
          page_id?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_page_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "active_creator_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_page_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "creator_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_pages: {
        Row: {
          config: Json
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          is_published: boolean
          layout: string
          slug: string
          title: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          config?: Json
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          is_published?: boolean
          layout?: string
          slug: string
          title?: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          config?: Json
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          is_published?: boolean
          layout?: string
          slug?: string
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      custom_blocklists: {
        Row: {
          created_at: string
          form_id: string
          id: string
          is_regex: boolean
          pattern: string
          severity: string | null
        }
        Insert: {
          created_at?: string
          form_id: string
          id?: string
          is_regex?: boolean
          pattern: string
          severity?: string | null
        }
        Update: {
          created_at?: string
          form_id?: string
          id?: string
          is_regex?: boolean
          pattern?: string
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_blocklists_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "active_request_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_blocklists_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "request_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_notes: {
        Row: {
          author_id: string
          created_at: string
          feedback_id: string
          id: string
          note: string
        }
        Insert: {
          author_id: string
          created_at?: string
          feedback_id: string
          id?: string
          note: string
        }
        Update: {
          author_id?: string
          created_at?: string
          feedback_id?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_notes_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "active_feedback_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_notes_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_submissions: {
        Row: {
          assigned_to: string | null
          contact: string | null
          created_at: string
          deleted_at: string | null
          feedback_type: string
          id: string
          is_read: boolean
          message: string
          metadata: Json
          priority: string
          related_id: string | null
          source_label: string
          source_page: string
          source_path: string
          status: string
          subject: string
          submitter_user_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          contact?: string | null
          created_at?: string
          deleted_at?: string | null
          feedback_type: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json
          priority?: string
          related_id?: string | null
          source_label?: string
          source_page?: string
          source_path?: string
          status?: string
          subject: string
          submitter_user_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          contact?: string | null
          created_at?: string
          deleted_at?: string | null
          feedback_type?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json
          priority?: string
          related_id?: string | null
          source_label?: string
          source_page?: string
          source_path?: string
          status?: string
          subject?: string
          submitter_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      flagged_requests: {
        Row: {
          created_at: string
          flagged_fields: Json
          form_id: string
          id: string
          reason: string | null
          request_id: string
          review_action: string | null
          review_notes: string | null
          reviewed: boolean
          reviewed_at: string | null
          risk_level: string
        }
        Insert: {
          created_at?: string
          flagged_fields?: Json
          form_id: string
          id?: string
          reason?: string | null
          request_id: string
          review_action?: string | null
          review_notes?: string | null
          reviewed?: boolean
          reviewed_at?: string | null
          risk_level: string
        }
        Update: {
          created_at?: string
          flagged_fields?: Json
          form_id?: string
          id?: string
          reason?: string | null
          request_id?: string
          review_action?: string | null
          review_notes?: string | null
          reviewed?: boolean
          reviewed_at?: string | null
          risk_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "flagged_requests_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "active_request_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flagged_requests_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "request_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flagged_requests_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "active_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flagged_requests_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          appearance: Json | null
          category: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_builtin: boolean | null
          name: string
          owner_id: string | null
          sections: Json
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          appearance?: Json | null
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_builtin?: boolean | null
          name: string
          owner_id?: string | null
          sections?: Json
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          appearance?: Json | null
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_builtin?: boolean | null
          name?: string
          owner_id?: string | null
          sections?: Json
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      global_blocklists: {
        Row: {
          created_at: string
          id: string
          is_regex: boolean
          pattern: string
          severity: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_regex?: boolean
          pattern: string
          severity?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_regex?: boolean
          pattern?: string
          severity?: string | null
        }
        Relationships: []
      }
      hub_community_record_comments: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          record_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          record_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          record_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_community_record_comments_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "hub_community_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_community_record_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_community_record_helpful: {
        Row: {
          created_at: string
          record_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          record_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          record_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_community_record_helpful_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "hub_community_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_community_record_helpful_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_community_record_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          record_id: string
          related_record_id: string
          relation_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          record_id: string
          related_record_id: string
          relation_type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          record_id?: string
          related_record_id?: string
          relation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_community_record_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_community_record_links_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "hub_community_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_community_record_links_related_record_id_fkey"
            columns: ["related_record_id"]
            isOneToOne: false
            referencedRelation: "hub_community_records"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_community_record_sources: {
        Row: {
          archive_url: string | null
          contributor_user_id: string | null
          created_at: string
          id: string
          is_published: boolean
          note: string | null
          published_at: string | null
          record_id: string
          sort_order: number
          source_name: string
          source_submission_id: string | null
          source_type: string
          source_url: string
          updated_at: string
        }
        Insert: {
          archive_url?: string | null
          contributor_user_id?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          note?: string | null
          published_at?: string | null
          record_id: string
          sort_order?: number
          source_name: string
          source_submission_id?: string | null
          source_type?: string
          source_url: string
          updated_at?: string
        }
        Update: {
          archive_url?: string | null
          contributor_user_id?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          note?: string | null
          published_at?: string | null
          record_id?: string
          sort_order?: number
          source_name?: string
          source_submission_id?: string | null
          source_type?: string
          source_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_community_record_sources_contributor_user_id_fkey"
            columns: ["contributor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_community_record_sources_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "hub_community_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_community_record_sources_source_submission_id_fkey"
            columns: ["source_submission_id"]
            isOneToOne: false
            referencedRelation: "hub_community_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_community_record_updates: {
        Row: {
          body: string | null
          contributor_user_id: string | null
          created_at: string
          id: string
          is_published: boolean
          markdown_asset_paths: string[]
          occurred_at: string
          record_id: string
          sort_order: number
          source_id: string | null
          source_submission_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          contributor_user_id?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          markdown_asset_paths?: string[]
          occurred_at: string
          record_id: string
          sort_order?: number
          source_id?: string | null
          source_submission_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          contributor_user_id?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          markdown_asset_paths?: string[]
          occurred_at?: string
          record_id?: string
          sort_order?: number
          source_id?: string | null
          source_submission_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_community_record_updates_contributor_user_id_fkey"
            columns: ["contributor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_community_record_updates_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "hub_community_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_community_record_updates_source_submission_id_fkey"
            columns: ["source_submission_id"]
            isOneToOne: false
            referencedRelation: "hub_community_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_community_updates_source_fkey"
            columns: ["source_id", "record_id"]
            isOneToOne: false
            referencedRelation: "hub_community_record_sources"
            referencedColumns: ["id", "record_id"]
          },
        ]
      }
      hub_community_records: {
        Row: {
          category: string
          content: string | null
          content_warning: string | null
          contributor_user_id: string | null
          created_at: string
          evidence_note: string | null
          evidence_status: string
          featured_order: number
          id: string
          impact: string | null
          is_featured: boolean
          is_published: boolean
          last_reviewed_at: string | null
          last_reviewed_by: string | null
          markdown_asset_paths: string[]
          occurred_at: string | null
          occurred_at_precision: string
          published_at: string | null
          revision: number
          slug: string
          source_submission_id: string | null
          status: string
          status_note: string | null
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content?: string | null
          content_warning?: string | null
          contributor_user_id?: string | null
          created_at?: string
          evidence_note?: string | null
          evidence_status?: string
          featured_order?: number
          id?: string
          impact?: string | null
          is_featured?: boolean
          is_published?: boolean
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          markdown_asset_paths?: string[]
          occurred_at?: string | null
          occurred_at_precision?: string
          published_at?: string | null
          revision?: number
          slug: string
          source_submission_id?: string | null
          status?: string
          status_note?: string | null
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string | null
          content_warning?: string | null
          contributor_user_id?: string | null
          created_at?: string
          evidence_note?: string | null
          evidence_status?: string
          featured_order?: number
          id?: string
          impact?: string | null
          is_featured?: boolean
          is_published?: boolean
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          markdown_asset_paths?: string[]
          occurred_at?: string | null
          occurred_at_precision?: string
          published_at?: string | null
          revision?: number
          slug?: string
          source_submission_id?: string | null
          status?: string
          status_note?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_community_records_contributor_user_id_fkey"
            columns: ["contributor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_community_records_last_reviewed_by_fkey"
            columns: ["last_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_community_records_source_submission_id_fkey"
            columns: ["source_submission_id"]
            isOneToOne: false
            referencedRelation: "hub_community_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_community_submissions: {
        Row: {
          base_revision: number | null
          content: string | null
          created_at: string
          details: string | null
          id: string
          markdown_asset_key: string | null
          markdown_asset_paths: string[]
          review_note: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_archive_url: string | null
          source_name: string | null
          source_note: string | null
          source_published_at: string | null
          source_type: string | null
          source_url: string | null
          submission_type: string
          suggested_category: string | null
          suggested_content_warning: string | null
          suggested_evidence_status: string | null
          suggested_impact: string | null
          suggested_occurred_at: string | null
          suggested_occurred_at_precision: string | null
          suggested_status: string | null
          summary: string | null
          target_record_id: string | null
          title: string | null
          update_body: string | null
          update_occurred_at: string | null
          update_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          base_revision?: number | null
          content?: string | null
          created_at?: string
          details?: string | null
          id?: string
          markdown_asset_key?: string | null
          markdown_asset_paths?: string[]
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_archive_url?: string | null
          source_name?: string | null
          source_note?: string | null
          source_published_at?: string | null
          source_type?: string | null
          source_url?: string | null
          submission_type: string
          suggested_category?: string | null
          suggested_content_warning?: string | null
          suggested_evidence_status?: string | null
          suggested_impact?: string | null
          suggested_occurred_at?: string | null
          suggested_occurred_at_precision?: string | null
          suggested_status?: string | null
          summary?: string | null
          target_record_id?: string | null
          title?: string | null
          update_body?: string | null
          update_occurred_at?: string | null
          update_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          base_revision?: number | null
          content?: string | null
          created_at?: string
          details?: string | null
          id?: string
          markdown_asset_key?: string | null
          markdown_asset_paths?: string[]
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_archive_url?: string | null
          source_name?: string | null
          source_note?: string | null
          source_published_at?: string | null
          source_type?: string | null
          source_url?: string | null
          submission_type?: string
          suggested_category?: string | null
          suggested_content_warning?: string | null
          suggested_evidence_status?: string | null
          suggested_impact?: string | null
          suggested_occurred_at?: string | null
          suggested_occurred_at_precision?: string | null
          suggested_status?: string | null
          summary?: string | null
          target_record_id?: string | null
          title?: string | null
          update_body?: string | null
          update_occurred_at?: string | null
          update_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_community_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_community_submissions_target_record_id_fkey"
            columns: ["target_record_id"]
            isOneToOne: false
            referencedRelation: "hub_community_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_community_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_log_post_comments: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_log_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "hub_log_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_log_post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_log_post_reactions: {
        Row: {
          created_at: string
          post_id: string
          reaction: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          reaction: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          reaction?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_log_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "hub_log_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_log_post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_log_post_views: {
        Row: {
          id: string
          post_id: string
          user_id: string | null
          viewed_at: string
          viewer_fingerprint: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id?: string | null
          viewed_at?: string
          viewer_fingerprint: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string | null
          viewed_at?: string
          viewer_fingerprint?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_log_post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "hub_log_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_log_post_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_log_posts: {
        Row: {
          body: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          label: string | null
          published_at: string | null
          sort_order: number
          source_name: string | null
          source_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          label?: string | null
          published_at?: string | null
          sort_order?: number
          source_name?: string | null
          source_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          label?: string | null
          published_at?: string | null
          sort_order?: number
          source_name?: string | null
          source_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      hub_resource_entries: {
        Row: {
          contributor_user_id: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_platform_pinned: boolean
          is_published: boolean
          label: string | null
          resource_type: string
          section_id: string
          slug: string
          sort_order: number
          source_submission_id: string | null
          summary: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          contributor_user_id?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_platform_pinned?: boolean
          is_published?: boolean
          label?: string | null
          resource_type?: string
          section_id: string
          slug: string
          sort_order?: number
          source_submission_id?: string | null
          summary?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          contributor_user_id?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_platform_pinned?: boolean
          is_published?: boolean
          label?: string | null
          resource_type?: string
          section_id?: string
          slug?: string
          sort_order?: number
          source_submission_id?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hub_resource_entries_contributor_user_id_fkey"
            columns: ["contributor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_resource_entries_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "hub_resource_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_resource_entries_source_submission_id_fkey"
            columns: ["source_submission_id"]
            isOneToOne: false
            referencedRelation: "hub_resource_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_resource_entry_comments: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          entry_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted_at?: string | null
          entry_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          entry_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_resource_entry_comments_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "hub_resource_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_resource_entry_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_resource_entry_reactions: {
        Row: {
          created_at: string
          entry_id: string
          reaction: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          reaction: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          reaction?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_resource_entry_reactions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "hub_resource_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_resource_entry_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_resource_entry_views: {
        Row: {
          entry_id: string
          id: string
          user_id: string | null
          viewed_at: string
          viewer_fingerprint: string
        }
        Insert: {
          entry_id: string
          id?: string
          user_id?: string | null
          viewed_at?: string
          viewer_fingerprint: string
        }
        Update: {
          entry_id?: string
          id?: string
          user_id?: string | null
          viewed_at?: string
          viewer_fingerprint?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_resource_entry_views_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "hub_resource_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_resource_entry_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_resource_sections: {
        Row: {
          accent_color: string
          created_at: string
          description: string | null
          icon_name: string
          id: string
          is_published: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          created_at?: string
          description?: string | null
          icon_name?: string
          id?: string
          is_published?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          created_at?: string
          description?: string | null
          icon_name?: string
          id?: string
          is_published?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      hub_resource_submissions: {
        Row: {
          created_at: string
          id: string
          label: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submission_type: string
          suggested_section_id: string | null
          summary: string | null
          target_entry_id: string | null
          title: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_type?: string
          suggested_section_id?: string | null
          summary?: string | null
          target_entry_id?: string | null
          title: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_type?: string
          suggested_section_id?: string | null
          summary?: string | null
          target_entry_id?: string | null
          title?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_resource_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_resource_submissions_suggested_section_id_fkey"
            columns: ["suggested_section_id"]
            isOneToOne: false
            referencedRelation: "hub_resource_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_resource_submissions_target_entry_id_fkey"
            columns: ["target_entry_id"]
            isOneToOne: false
            referencedRelation: "hub_resource_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_resource_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_blocklist: {
        Row: {
          blocked_by: string | null
          created_at: string
          id: string
          ip_address: string
          reason: string | null
        }
        Insert: {
          blocked_by?: string | null
          created_at?: string
          id?: string
          ip_address: string
          reason?: string | null
        }
        Update: {
          blocked_by?: string | null
          created_at?: string
          id?: string
          ip_address?: string
          reason?: string | null
        }
        Relationships: []
      }
      moderation_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          moderator_id: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          moderator_id?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          moderator_id?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          collaborations: boolean
          created_at: string
          moderation: boolean
          social: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          collaborations?: boolean
          created_at?: string
          moderation?: boolean
          social?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          collaborations?: boolean
          created_at?: string
          moderation?: boolean
          social?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_badge_awards: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          badge_slug: string
          created_at: string
          id: string
          metadata: Json
          note: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          badge_slug: string
          created_at?: string
          id?: string
          metadata?: Json
          note?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          badge_slug?: string
          created_at?: string
          id?: string
          metadata?: Json
          note?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_badge_awards_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_badge_awards_badge_slug_fkey"
            columns: ["badge_slug"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "profile_badge_awards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_featured_bots: {
        Row: {
          bot_id: string
          created_at: string
          profile_id: string
          sort_order: number
        }
        Insert: {
          bot_id: string
          created_at?: string
          profile_id: string
          sort_order?: number
        }
        Update: {
          bot_id?: string
          created_at?: string
          profile_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_bot"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "active_bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bot"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profile"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_section_bots: {
        Row: {
          bot_id: string
          created_at: string
          profile_id: string
          sort_order: number
        }
        Insert: {
          bot_id: string
          created_at?: string
          profile_id: string
          sort_order?: number
        }
        Update: {
          bot_id?: string
          created_at?: string
          profile_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "profile_section_bots_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "active_bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_section_bots_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_section_bots_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_section_creator_pages: {
        Row: {
          created_at: string
          creator_page_id: string
          profile_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          creator_page_id: string
          profile_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          creator_page_id?: string
          profile_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "profile_section_creator_pages_creator_page_id_fkey"
            columns: ["creator_page_id"]
            isOneToOne: false
            referencedRelation: "active_creator_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_section_creator_pages_creator_page_id_fkey"
            columns: ["creator_page_id"]
            isOneToOne: false
            referencedRelation: "creator_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_section_creator_pages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_section_forms: {
        Row: {
          created_at: string
          form_id: string
          profile_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          form_id: string
          profile_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          form_id?: string
          profile_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "profile_section_forms_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "active_request_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_section_forms_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "request_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_section_forms_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_section_worlds: {
        Row: {
          created_at: string
          profile_id: string
          sort_order: number
          world_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          sort_order?: number
          world_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          sort_order?: number
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_section_worlds_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_section_worlds_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "atlas_worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_sections: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          profile_id: string
          section_key: string
          selection_mode: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          profile_id: string
          section_key: string
          selection_mode?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          profile_id?: string
          section_key?: string
          selection_mode?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_sections_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string
          created_at: string
          custom_css: string | null
          display_name: string | null
          id: string
          is_admin: boolean
          is_blocked: boolean
          location: string | null
          profile_badges: Json | null
          profile_completeness: number | null
          pronouns: string | null
          slug: string | null
          social_links: Json
          specialties: string[] | null
          staff_role: string | null
          status_message: string | null
          tagline: string
          theme: Json
          updated_at: string
          username: string | null
          visibility: string | null
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string
          created_at?: string
          custom_css?: string | null
          display_name?: string | null
          id: string
          is_admin?: boolean
          is_blocked?: boolean
          location?: string | null
          profile_badges?: Json | null
          profile_completeness?: number | null
          pronouns?: string | null
          slug?: string | null
          social_links?: Json
          specialties?: string[] | null
          staff_role?: string | null
          status_message?: string | null
          tagline?: string
          theme?: Json
          updated_at?: string
          username?: string | null
          visibility?: string | null
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string
          created_at?: string
          custom_css?: string | null
          display_name?: string | null
          id?: string
          is_admin?: boolean
          is_blocked?: boolean
          location?: string | null
          profile_badges?: Json | null
          profile_completeness?: number | null
          pronouns?: string | null
          slug?: string | null
          social_links?: Json
          specialties?: string[] | null
          staff_role?: string | null
          status_message?: string | null
          tagline?: string
          theme?: Json
          updated_at?: string
          username?: string | null
          visibility?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      request_forms: {
        Row: {
          appearance: Json
          banner_asset_path: string | null
          banner_url: string | null
          created_at: string
          deactivated_accent_color: string | null
          deactivated_message: string | null
          deactivated_redirect_label: string | null
          deactivated_redirect_url: string | null
          deleted_at: string | null
          description: string
          id: string
          is_active: boolean
          sections: Json
          security_sensitivity: string | null
          shareable_link: string
          title: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          appearance?: Json
          banner_asset_path?: string | null
          banner_url?: string | null
          created_at?: string
          deactivated_accent_color?: string | null
          deactivated_message?: string | null
          deactivated_redirect_label?: string | null
          deactivated_redirect_url?: string | null
          deleted_at?: string | null
          description?: string
          id?: string
          is_active?: boolean
          sections?: Json
          security_sensitivity?: string | null
          shareable_link: string
          title: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          appearance?: Json
          banner_asset_path?: string | null
          banner_url?: string | null
          created_at?: string
          deactivated_accent_color?: string | null
          deactivated_message?: string | null
          deactivated_redirect_label?: string | null
          deactivated_redirect_url?: string | null
          deleted_at?: string | null
          description?: string
          id?: string
          is_active?: boolean
          sections?: Json
          security_sensitivity?: string | null
          shareable_link?: string
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      requests: {
        Row: {
          created_at: string
          deleted_at: string | null
          form_id: string
          form_title: string
          honeypot_value: string | null
          id: string
          ip_address: string | null
          notes: string | null
          response_labels: Json
          responses: Json
          status: string
          submission_ip: string | null
          submission_user_agent: string | null
          submitter_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          form_id: string
          form_title: string
          honeypot_value?: string | null
          id?: string
          ip_address?: string | null
          notes?: string | null
          response_labels?: Json
          responses?: Json
          status?: string
          submission_ip?: string | null
          submission_user_agent?: string | null
          submitter_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          form_id?: string
          form_title?: string
          honeypot_value?: string | null
          id?: string
          ip_address?: string | null
          notes?: string | null
          response_labels?: Json
          responses?: Json
          status?: string
          submission_ip?: string | null
          submission_user_agent?: string | null
          submitter_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "active_request_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "request_forms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_bots: {
        Row: {
          alternate_greetings: string[] | null
          chat_name: string | null
          created_at: string | null
          deleted_at: string | null
          example_dialogues: string | null
          first_message: string | null
          hide_sensitive_fields: boolean | null
          id: string | null
          image_url: string | null
          name: string | null
          personality: string | null
          rating: string | null
          require_collab_approval: boolean | null
          scenario: string | null
          short_description: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string | null
          visibility: string | null
        }
        Insert: {
          alternate_greetings?: string[] | null
          chat_name?: string | null
          created_at?: string | null
          deleted_at?: string | null
          example_dialogues?: string | null
          first_message?: string | null
          hide_sensitive_fields?: boolean | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          personality?: string | null
          rating?: string | null
          require_collab_approval?: boolean | null
          scenario?: string | null
          short_description?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          visibility?: string | null
        }
        Update: {
          alternate_greetings?: string[] | null
          chat_name?: string | null
          created_at?: string | null
          deleted_at?: string | null
          example_dialogues?: string | null
          first_message?: string | null
          hide_sensitive_fields?: boolean | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          personality?: string | null
          rating?: string | null
          require_collab_approval?: boolean | null
          scenario?: string | null
          short_description?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      active_creator_page_sections: {
        Row: {
          config: Json | null
          created_at: string | null
          deleted_at: string | null
          id: string | null
          kind: string | null
          page_id: string | null
          position: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string | null
          kind?: string | null
          page_id?: string | null
          position?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string | null
          kind?: string | null
          page_id?: string | null
          position?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_page_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "active_creator_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_page_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "creator_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      active_creator_pages: {
        Row: {
          config: Json | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string | null
          is_published: boolean | null
          layout: string | null
          slug: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          visibility: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string | null
          is_published?: boolean | null
          layout?: string | null
          slug?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          visibility?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string | null
          is_published?: boolean | null
          layout?: string | null
          slug?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      active_feedback_submissions: {
        Row: {
          assigned_to: string | null
          contact: string | null
          created_at: string | null
          deleted_at: string | null
          feedback_type: string | null
          id: string | null
          is_read: boolean | null
          message: string | null
          metadata: Json | null
          priority: string | null
          related_id: string | null
          source_label: string | null
          source_page: string | null
          source_path: string | null
          status: string | null
          subject: string | null
          submitter_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          contact?: string | null
          created_at?: string | null
          deleted_at?: string | null
          feedback_type?: string | null
          id?: string | null
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          priority?: string | null
          related_id?: string | null
          source_label?: string | null
          source_page?: string | null
          source_path?: string | null
          status?: string | null
          subject?: string | null
          submitter_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          contact?: string | null
          created_at?: string | null
          deleted_at?: string | null
          feedback_type?: string | null
          id?: string | null
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          priority?: string | null
          related_id?: string | null
          source_label?: string | null
          source_page?: string | null
          source_path?: string | null
          status?: string | null
          subject?: string | null
          submitter_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      active_hub_log_post_comments: {
        Row: {
          body: string | null
          created_at: string | null
          deleted_at: string | null
          id: string | null
          post_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string | null
          post_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string | null
          post_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hub_log_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "hub_log_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_log_post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      active_hub_resource_entry_comments: {
        Row: {
          body: string | null
          created_at: string | null
          deleted_at: string | null
          entry_id: string | null
          id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          deleted_at?: string | null
          entry_id?: string | null
          id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          deleted_at?: string | null
          entry_id?: string | null
          id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hub_resource_entry_comments_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "hub_resource_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_resource_entry_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      active_notifications: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string | null
          is_read: boolean | null
          link: string | null
          message: string | null
          metadata: Json | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string | null
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          metadata?: Json | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string | null
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          metadata?: Json | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      active_profile_featured_bots: {
        Row: {
          bot_id: string | null
          created_at: string | null
          profile_id: string | null
          sort_order: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_bot"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "active_bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bot"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_profile"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      active_request_forms: {
        Row: {
          appearance: Json | null
          banner_asset_path: string | null
          banner_url: string | null
          created_at: string | null
          deactivated_accent_color: string | null
          deactivated_message: string | null
          deactivated_redirect_label: string | null
          deactivated_redirect_url: string | null
          deleted_at: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          sections: Json | null
          security_sensitivity: string | null
          shareable_link: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          visibility: string | null
        }
        Insert: {
          appearance?: Json | null
          banner_asset_path?: string | null
          banner_url?: string | null
          created_at?: string | null
          deactivated_accent_color?: string | null
          deactivated_message?: string | null
          deactivated_redirect_label?: string | null
          deactivated_redirect_url?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          sections?: Json | null
          security_sensitivity?: string | null
          shareable_link?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          visibility?: string | null
        }
        Update: {
          appearance?: Json | null
          banner_asset_path?: string | null
          banner_url?: string | null
          created_at?: string | null
          deactivated_accent_color?: string | null
          deactivated_message?: string | null
          deactivated_redirect_label?: string | null
          deactivated_redirect_url?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          sections?: Json | null
          security_sensitivity?: string | null
          shareable_link?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      active_requests: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          form_id: string | null
          form_title: string | null
          honeypot_value: string | null
          id: string | null
          ip_address: string | null
          notes: string | null
          response_labels: Json | null
          responses: Json | null
          status: string | null
          submission_ip: string | null
          submission_user_agent: string | null
          submitter_name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          form_id?: string | null
          form_title?: string | null
          honeypot_value?: string | null
          id?: string | null
          ip_address?: string | null
          notes?: string | null
          response_labels?: Json | null
          responses?: Json | null
          status?: string | null
          submission_ip?: string | null
          submission_user_agent?: string | null
          submitter_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          form_id?: string | null
          form_title?: string | null
          honeypot_value?: string | null
          id?: string | null
          ip_address?: string | null
          notes?: string | null
          response_labels?: Json | null
          responses?: Json | null
          status?: string | null
          submission_ip?: string | null
          submission_user_agent?: string | null
          submitter_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "active_request_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "request_forms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_custom_blocklist: {
        Args: { p_form_id: string; p_is_regex?: boolean; p_pattern: string }
        Returns: undefined
      }
      apply_bot_change_request_if_current: {
        Args: { p_change_request_id: string; p_changes: Json }
        Returns: Json
      }
      award_badge: {
        Args: {
          p_badge_id: string
          p_color?: string
          p_icon?: string
          p_label: string
          p_user_id: string
        }
        Returns: undefined
      }
      award_profile_badge: {
        Args: {
          p_awarded_by?: string
          p_badge_slug: string
          p_metadata?: Json
          p_note?: string
          p_profile_id: string
        }
        Returns: undefined
      }
      badge_metric_value: {
        Args: { p_metric: string; p_profile_id: string }
        Returns: number
      }
      badge_rule_matches: {
        Args: { p_profile_id: string; p_rule: Json }
        Returns: boolean
      }
      calculate_profile_completeness: {
        Args: { p_user_id: string }
        Returns: number
      }
      can_create_request_for_form: {
        Args: { p_form_id: string }
        Returns: boolean
      }
      can_view_resource: {
        Args: { p_owner_id: string; p_visibility: string }
        Returns: boolean
      }
      capture_bot_version: {
        Args: {
          p_bot_id: string
          p_change_request_id?: string
          p_changed_fields?: string[]
          p_restored_from_version_id?: string
          p_source?: string
        }
        Returns: {
          bot_id: string
          change_request_id: string | null
          changed_fields: string[]
          created_at: string
          created_by: string | null
          id: string
          restored_from_version_id: string | null
          snapshot: Json
          source: string
          version_number: number
        }
        SetofOptions: {
          from: "*"
          to: "bot_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_bot_collaboration_lock: {
        Args: { p_bot_id: string; p_field_key: string; p_ttl_seconds?: number }
        Returns: boolean
      }
      consume_server_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: {
          allowed: boolean
          remaining: number
          retry_after_seconds: number
        }[]
      }
      delete_user_account: { Args: never; Returns: undefined }
      delete_user_as_admin: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      dismiss_notification: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      evaluate_profile_badges: {
        Args: { p_profile_id: string }
        Returns: number
      }
      get_active_badge_definitions: {
        Args: never
        Returns: {
          category: string
          color: string
          created_at: string
          description: string | null
          emoji: string | null
          group_key: string | null
          icon: string
          image_url: string | null
          is_active: boolean
          is_manual_only: boolean
          is_system: boolean
          label: string
          metadata: Json
          rarity: string
          slug: string
          sort_order: number
          updated_at: string
          visibility: string
        }[]
        SetofOptions: {
          from: "*"
          to: "badge_definitions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_badge_definitions_admin: {
        Args: { p_include_inactive?: boolean }
        Returns: {
          category: string
          color: string
          created_at: string
          description: string | null
          emoji: string | null
          group_key: string | null
          icon: string
          image_url: string | null
          is_active: boolean
          is_manual_only: boolean
          is_system: boolean
          label: string
          metadata: Json
          rarity: string
          slug: string
          sort_order: number
          updated_at: string
          visibility: string
        }[]
        SetofOptions: {
          from: "*"
          to: "badge_definitions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_bot_activity: {
        Args: { p_bot_id: string; p_limit?: number }
        Returns: {
          action: string
          avatar_url: string
          bot_id: string
          created_at: string
          details: Json
          display_name: string
          id: string
          user_id: string
          username: string
        }[]
      }
      get_bot_change_requests: {
        Args: { p_bot_id: string }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          author_username: string
          base_snapshot: Json
          base_version_id: string
          base_version_number: number
          bot_id: string
          changes_requested_at: string
          changes_requested_by: string
          created_at: string
          description: string
          id: string
          proposed_changes: Json
          rejection_reason: string
          review_comment: string
          reviewed_at: string
          reviewed_by: string
          reviewer_display_name: string
          reviewer_username: string
          status: string
          title: string
          updated_at: string
        }[]
      }
      get_collaborative_bots: {
        Args: { p_user_id: string }
        Returns: {
          alternate_greetings: string[]
          chat_name: string
          collaborator_role: string
          collaborator_status: string
          created_at: string
          example_dialogues: string
          first_message: string
          id: string
          image_url: string
          name: string
          owner_avatar_url: string
          owner_display_name: string
          owner_username: string
          personality: string
          rating: string
          scenario: string
          short_description: string
          tags: string[]
          updated_at: string
          user_id: string
        }[]
      }
      get_creator_page_public_form_states: {
        Args: { p_form_ids: string[] }
        Returns: {
          deactivated_accent_color: string
          deactivated_message: string
          deactivated_redirect_label: string
          deactivated_redirect_url: string
          id: string
          is_active: boolean
          shareable_link: string
        }[]
      }
      get_follower_count: { Args: { p_user_id: string }; Returns: number }
      get_following_count: { Args: { p_user_id: string }; Returns: number }
      get_my_pending_bot_invites: {
        Args: never
        Returns: {
          bot_id: string
          bot_image_url: string
          bot_name: string
          bot_short_description: string
          created_at: string
          expires_at: string
          id: string
          invite_message: string
          invited_by: string
          inviter_avatar_url: string
          inviter_display_name: string
          inviter_username: string
          owner_avatar_url: string
          owner_display_name: string
          owner_id: string
          owner_username: string
          role: string
          status: string
          team_size: number
        }[]
      }
      get_pending_change_requests_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_pending_invites_with_bot_info: {
        Args: { p_user_id: string }
        Returns: {
          bot_id: string
          bot_image_url: string
          bot_name: string
          bot_short_description: string
          created_at: string
          id: string
          invited_by: string
          inviter_avatar_url: string
          inviter_display_name: string
          inviter_username: string
          role: string
          status: string
        }[]
      }
      get_profile_badges: { Args: { p_profile_id: string }; Returns: Json }
      get_public_profile_forms: {
        Args: { p_user_id: string }
        Returns: {
          description: string
          id: string
          is_active: boolean
          responses_count: number
          sections: Json
          shareable_link: string
          title: string
          updated_at: string
        }[]
      }
      get_public_profile_section_selections: {
        Args: { p_profile_id: string }
        Returns: {
          item_id: string
          section_key: string
          sort_order: number
        }[]
      }
      get_public_request_form: {
        Args: { p_shareable_link: string }
        Returns: {
          appearance: Json
          banner_asset_path: string
          banner_url: string
          deactivated_accent_color: string
          deactivated_message: string
          deactivated_redirect_label: string
          deactivated_redirect_url: string
          description: string
          id: string
          is_active: boolean
          sections: Json
          title: string
          user_id: string
        }[]
      }
      get_submission_blocklists: {
        Args: { p_form_id: string }
        Returns: {
          is_regex: boolean
          pattern: string
          severity: string
        }[]
      }
      get_submission_security_settings: {
        Args: { p_form_id: string }
        Returns: {
          security_sensitivity: string
        }[]
      }
      get_unread_notification_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      heartbeat_bot_collaboration_lock: {
        Args: { p_bot_id: string; p_field_key: string; p_ttl_seconds?: number }
        Returns: boolean
      }
      increment_template_usage: {
        Args: { p_template_id: string }
        Returns: undefined
      }
      is_admin_user: { Args: { p_user_id: string }; Returns: boolean }
      is_bot_co_owner: {
        Args: { p_bot_id: string; p_user_id: string }
        Returns: boolean
      }
      is_bot_collaborator: {
        Args: { p_bot_id: string; p_user_id: string }
        Returns: boolean
      }
      is_bot_editor: {
        Args: { p_bot_id: string; p_user_id: string }
        Returns: boolean
      }
      is_bot_owner: {
        Args: { p_bot_id: string; p_user_id: string }
        Returns: boolean
      }
      is_current_user_admin: { Args: never; Returns: boolean }
      is_following: {
        Args: { p_follower: string; p_following: string }
        Returns: boolean
      }
      is_ip_blocked_for_form: {
        Args: { p_form_id: string; p_ip_address: string }
        Returns: boolean
      }
      is_notification_type_enabled: {
        Args: { p_type: string; p_user_id: string }
        Returns: boolean
      }
      is_owner_user: { Args: { p_user_id: string }; Returns: boolean }
      is_profile_follower: { Args: { p_profile_id: string }; Returns: boolean }
      is_staff_user: { Args: { p_user_id: string }; Returns: boolean }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      purge_old_soft_deleted: {
        Args: { p_days?: number; p_table: string }
        Returns: number
      }
      reconcile_all_profile_badges: { Args: never; Returns: number }
      record_flagged_submission: {
        Args: {
          p_flagged_fields: Json
          p_form_id: string
          p_reason?: string
          p_request_id: string
          p_risk_level: string
        }
        Returns: undefined
      }
      record_hub_log_post_view: {
        Args: {
          p_post_id: string
          p_user_id?: string
          p_viewer_fingerprint: string
        }
        Returns: undefined
      }
      record_hub_resource_entry_view: {
        Args: {
          p_entry_id: string
          p_user_id?: string
          p_viewer_fingerprint: string
        }
        Returns: undefined
      }
      release_bot_collaboration_lock: {
        Args: { p_bot_id: string; p_field_key: string }
        Returns: boolean
      }
      restore_bot_version: {
        Args: { p_version_id: string }
        Returns: {
          bot_id: string
          change_request_id: string | null
          changed_fields: string[]
          created_at: string
          created_by: string | null
          id: string
          restored_from_version_id: string | null
          snapshot: Json
          source: string
          version_number: number
        }
        SetofOptions: {
          from: "*"
          to: "bot_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      restore_soft_deleted: {
        Args: { p_id: string; p_table: string }
        Returns: undefined
      }
      revoke_profile_badge: {
        Args: { p_badge_slug: string; p_profile_id: string }
        Returns: undefined
      }
      sync_profile_badges_cache: {
        Args: { p_profile_id: string }
        Returns: undefined
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
    Enums: {},
  },
} as const
