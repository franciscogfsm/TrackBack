export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      metric_responses: {
        Row: {
          id: string;
          athlete_id: string;
          metric_id: string;
          rating_value: number | null;
          text_value: string | null;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          athlete_id: string;
          metric_id: string;
          rating_value?: number | null;
          text_value?: string | null;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          athlete_id?: string;
          metric_id?: string;
          rating_value?: number | null;
          text_value?: string | null;
          date?: string;
          created_at?: string;
        };
      };
      custom_metrics: {
        Row: {
          id: string;
          manager_id: string;
          title: string;
          description: string | null;
          type: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          manager_id: string;
          title: string;
          description?: string | null;
          type: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          manager_id?: string;
          title?: string;
          description?: string | null;
          type?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      daily_form_status: {
        Row: {
          id: string;
          date: string;
          manager_id: string;
          is_open: boolean;
          open_time: string | null;
          close_time: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          manager_id: string;
          is_open?: boolean;
          open_time?: string | null;
          close_time?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          manager_id?: string;
          is_open?: boolean;
          open_time?: string | null;
          close_time?: string | null;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          role: string;
          full_name: string;
          created_at: string;
          manager_id: string | null;
          email: string;
          avatar_url: string | null;
        };
        Insert: {
          id: string;
          role: string;
          full_name: string;
          created_at?: string;
          manager_id?: string | null;
          email: string;
          avatar_url?: string | null;
        };
        Update: {
          id?: string;
          role?: string;
          full_name?: string;
          created_at?: string;
          manager_id?: string | null;
          email?: string;
          avatar_url?: string | null;
        };
      };
      manager_invitations: {
        Row: {
          id: string;
          manager_id: string;
          invitation_code: string;
          email: string | null;
          created_at: string;
          expires_at: string;
          status: "pending" | "accepted" | "expired";
        };
        Insert: {
          id?: string;
          manager_id: string;
          invitation_code: string;
          email?: string | null;
          created_at?: string;
          expires_at: string;
          status?: "pending" | "accepted" | "expired";
        };
        Update: {
          id?: string;
          manager_id?: string;
          invitation_code?: string;
          email?: string | null;
          created_at?: string;
          expires_at?: string;
          status?: "pending" | "accepted" | "expired";
        };
      };
      athlete_manager_connections: {
        Row: {
          id: string;
          athlete_id: string;
          manager_id: string;
          invitation_id: string;
          created_at: string;
          status: "active" | "inactive";
        };
        Insert: {
          id?: string;
          athlete_id: string;
          manager_id: string;
          invitation_id: string;
          created_at?: string;
          status?: "active" | "inactive";
        };
        Update: {
          id?: string;
          athlete_id?: string;
          manager_id?: string;
          invitation_id?: string;
          created_at?: string;
          status?: "active" | "inactive";
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];

// Derived types
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: "athlete" | "manager";
  manager_id?: string;
}

export interface CustomMetric {
  id: number;
  title: string;
  description?: string;
  type: "rating" | "text";
  manager_id: string;
  created_at: string;
  is_active: boolean;
}

export interface MetricResponseType {
  id: number;
  athlete_id: string;
  metric_id: number;
  rating_value?: number;
  text_value?: string;
  date: string;
}

export interface DailyFormStatus {
  id: number;
  date: string;
  manager_id: string;
  is_open: boolean;
  open_time: string;
  close_time: string;
  manually_closed?: boolean;
}

export interface Metric {
  id: number;
  name: string;
  description?: string;
  type: "rating" | "text";
  manager_id: string;
  created_at: string;
}

export type TrainingType =
  | "regenerative"
  | "interval_metabolic"
  | "technical_tactical"
  | "strength_power"
  | "speed_agility"
  | "mobility_regenerative"
  | "competition"
  | "injury_prevention"
  | "other_activity"
  | "travel";

export interface TrainingSession {
  id: string;
  athlete_id: string;
  date: string;
  session: "AM" | "PM";
  training_type: TrainingType;
  rpe: number;
  duration: number;
  unit_load: number;
  created_at: string;
}

export type AthleteManagerConnection = {
  id: string;
  athlete_id: string;
  manager_id: string;
  invitation_id: string;
  created_at: string;
  status: "active" | "inactive";
};
