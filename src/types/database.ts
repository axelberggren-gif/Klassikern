// ============================================================================
// Supabase Database Types
// ============================================================================
// Generated-style types matching the Supabase schema defined in
// supabase/migrations/001_initial_schema.sql
//
// These follow the standard Supabase pattern so the typed client works
// with .from('table_name') calls.
// ============================================================================

// ---------------------------------------------------------------------------
// Enum types (matching Postgres custom types)
// ---------------------------------------------------------------------------

export type SportType = 'cycling' | 'running' | 'swimming' | 'hiit' | 'rest' | 'other';
export type EffortRating = 1 | 2 | 3 | 4 | 5;
export type BadgeCategory = 'sport' | 'consistency' | 'social' | 'special';
export type FeedEventType =
  | 'session_logged'
  | 'badge_earned'
  | 'streak_milestone'
  | 'waypoint_reached'
  | 'challenge_completed';
export type GroupMemberRole = 'owner' | 'admin' | 'member';

// ---------------------------------------------------------------------------
// Database interface (Supabase generated types pattern)
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          email: string | null;
          goal_vr_hours: number;
          goal_vansbro_minutes: number;
          goal_lidingo_hours: number;
          total_ep: number;
          current_streak: number;
          longest_streak: number;
          streak_freezes_remaining: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          avatar_url?: string | null;
          email?: string | null;
          goal_vr_hours?: number;
          goal_vansbro_minutes?: number;
          goal_lidingo_hours?: number;
          total_ep?: number;
          current_streak?: number;
          longest_streak?: number;
          streak_freezes_remaining?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string | null;
          email?: string | null;
          goal_vr_hours?: number;
          goal_vansbro_minutes?: number;
          goal_lidingo_hours?: number;
          total_ep?: number;
          current_streak?: number;
          longest_streak?: number;
          streak_freezes_remaining?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          invite_code?: string;
          created_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          role: GroupMemberRole;
          joined_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          role?: GroupMemberRole;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          role?: GroupMemberRole;
          joined_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      planned_sessions: {
        Row: {
          id: string;
          group_id: string;
          week_number: number;
          day_of_week: number;
          date: string;
          sport_type: SportType;
          title: string;
          description: string | null;
          suggested_duration_minutes: number | null;
          suggested_intensity: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          week_number: number;
          day_of_week: number;
          date: string;
          sport_type: SportType;
          title: string;
          description?: string | null;
          suggested_duration_minutes?: number | null;
          suggested_intensity?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          week_number?: number;
          day_of_week?: number;
          date?: string;
          sport_type?: SportType;
          title?: string;
          description?: string | null;
          suggested_duration_minutes?: number | null;
          suggested_intensity?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          planned_session_id: string | null;
          sport_type: SportType;
          date: string;
          duration_minutes: number;
          distance_km: number | null;
          effort_rating: EffortRating;
          note: string | null;
          ep_earned: number;
          is_bonus: boolean;
          strava_activity_id: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          planned_session_id?: string | null;
          sport_type: SportType;
          date: string;
          duration_minutes: number;
          distance_km?: number | null;
          effort_rating: EffortRating;
          note?: string | null;
          ep_earned?: number;
          is_bonus?: boolean;
          strava_activity_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          planned_session_id?: string | null;
          sport_type?: SportType;
          date?: string;
          duration_minutes?: number;
          distance_km?: number | null;
          effort_rating?: EffortRating;
          note?: string | null;
          ep_earned?: number;
          is_bonus?: boolean;
          strava_activity_id?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      badges: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon_key: string;
          category: BadgeCategory;
          sport_type: SportType | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          icon_key: string;
          category: BadgeCategory;
          sport_type?: SportType | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          icon_key?: string;
          category?: BadgeCategory;
          sport_type?: SportType | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          earned_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          badge_id: string;
          earned_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          badge_id?: string;
          earned_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      activity_feed: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          event_type: FeedEventType;
          event_data: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          event_type: FeedEventType;
          event_data?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          event_type?: FeedEventType;
          event_data?: Record<string, unknown>;
          updated_at?: string;
        };
        Relationships: [];
      };
      feed_reactions: {
        Row: {
          id: string;
          feed_item_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          feed_item_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          feed_item_id?: string;
          user_id?: string;
          emoji?: string;
        };
        Relationships: [];
      };
      weekly_challenges: {
        Row: {
          id: string;
          group_id: string;
          week_number: number;
          title: string;
          description: string;
          challenge_type: string;
          target_value: number;
          current_value: number;
          is_completed: boolean;
          started_at: string;
          ends_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          week_number: number;
          title: string;
          description: string;
          challenge_type: string;
          target_value?: number;
          current_value?: number;
          is_completed?: boolean;
          started_at?: string;
          ends_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          week_number?: number;
          title?: string;
          description?: string;
          challenge_type?: string;
          target_value?: number;
          current_value?: number;
          is_completed?: boolean;
          started_at?: string;
          ends_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      expedition_waypoints: {
        Row: {
          id: number;
          name: string;
          description: string;
          ep_threshold: number;
          map_x: number;
          map_y: number;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          description: string;
          ep_threshold: number;
          map_x: number;
          map_y: number;
          sort_order: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          description?: string;
          ep_threshold?: number;
          map_x?: number;
          map_y?: number;
          sort_order?: number;
        };
        Relationships: [];
      };
      strava_connections: {
        Row: {
          id: string;
          user_id: string;
          strava_athlete_id: number;
          access_token: string;
          refresh_token: string;
          token_expires_at: string;
          scope: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          strava_athlete_id: number;
          access_token: string;
          refresh_token: string;
          token_expires_at: string;
          scope?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          strava_athlete_id?: number;
          access_token?: string;
          refresh_token?: string;
          token_expires_at?: string;
          scope?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      sport_type: SportType;
      effort_rating: EffortRating;
      badge_category: BadgeCategory;
      feed_event_type: FeedEventType;
    };
  };
}

// ---------------------------------------------------------------------------
// Convenience type aliases (Row types for common use)
// ---------------------------------------------------------------------------
// These match the existing interface names used throughout the app,
// ensuring backward compatibility.

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Group = Database['public']['Tables']['groups']['Row'];
export type GroupMember = Database['public']['Tables']['group_members']['Row'];
export type PlannedSession = Database['public']['Tables']['planned_sessions']['Row'];
export type Session = Database['public']['Tables']['sessions']['Row'];
export type Badge = Database['public']['Tables']['badges']['Row'];
export type UserBadge = Database['public']['Tables']['user_badges']['Row'];
export type ActivityFeedItem = Database['public']['Tables']['activity_feed']['Row'];
export type FeedReaction = Database['public']['Tables']['feed_reactions']['Row'];
export type WeeklyChallenge = Database['public']['Tables']['weekly_challenges']['Row'];
export type ExpeditionWaypoint = Database['public']['Tables']['expedition_waypoints']['Row'];
export type StravaConnection = Database['public']['Tables']['strava_connections']['Row'];

// Backward-compatible alias: the old code uses "User" instead of "Profile".
// The mock-data / localStorage layer also uses group_id on users, even though
// the database models this as a many-to-many via group_members. We keep the
// field here so the existing MVP code compiles without changes.
export type User = Profile & {
  group_id: string | null;
};

// ---------------------------------------------------------------------------
// Insert / Update type aliases
// ---------------------------------------------------------------------------

export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type GroupInsert = Database['public']['Tables']['groups']['Insert'];
export type GroupUpdate = Database['public']['Tables']['groups']['Update'];
export type GroupMemberInsert = Database['public']['Tables']['group_members']['Insert'];
export type SessionInsert = Database['public']['Tables']['sessions']['Insert'];
export type SessionUpdate = Database['public']['Tables']['sessions']['Update'];
export type PlannedSessionInsert = Database['public']['Tables']['planned_sessions']['Insert'];
export type ActivityFeedInsert = Database['public']['Tables']['activity_feed']['Insert'];
export type FeedReactionInsert = Database['public']['Tables']['feed_reactions']['Insert'];
export type UserBadgeInsert = Database['public']['Tables']['user_badges']['Insert'];
export type StravaConnectionInsert = Database['public']['Tables']['strava_connections']['Insert'];
export type StravaConnectionUpdate = Database['public']['Tables']['strava_connections']['Update'];

// ---------------------------------------------------------------------------
// Joined / extended types for queries
// ---------------------------------------------------------------------------

export interface SessionWithUser extends Session {
  user: Profile;
}

export interface SessionWithPlanned extends Session {
  planned_session: PlannedSession | null;
}

export interface UserBadgeWithBadge extends UserBadge {
  badge: Badge;
}

export interface ActivityFeedItemWithUser extends ActivityFeedItem {
  user: Profile;
  reactions?: FeedReaction[];
}

export type GroupMemberWithProfile = {
  user_id: string;
  role: string;
  joined_at: string;
  profile: Profile;
};

export type GroupDetails = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string | null;
  members: GroupMemberWithProfile[];
};
