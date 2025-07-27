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
      athlete_groups: {
        Row: {
          id: string;
          manager_id: string;
          name: string;
          description: string | null;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          manager_id: string;
          name: string;
          description?: string | null;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          manager_id?: string;
          name?: string;
          description?: string | null;
          color?: string;
          created_at?: string;
          updated_at?: string;
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
          group_id: string | null;
        };
        Insert: {
          id: string;
          role: string;
          full_name: string;
          created_at?: string;
          manager_id?: string | null;
          email: string;
          avatar_url?: string | null;
          group_id?: string | null;
        };
        Update: {
          id?: string;
          role?: string;
          full_name?: string;
          created_at?: string;
          manager_id?: string | null;
          email?: string;
          avatar_url?: string | null;
          group_id?: string | null;
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
      weight_records: {
        Row: {
          id: string;
          athlete_id: string;
          weight: number;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          athlete_id: string;
          weight: number;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          athlete_id?: string;
          weight?: number;
          date?: string;
          created_at?: string;
        };
      };
      training_programs: {
        Row: {
          id: string;
          manager_id: string;
          plan_a_exercises: string[];
          plan_b_exercises: string[];
          group_id: string | null;
          created_at: string;
          updated_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          manager_id: string;
          plan_a_exercises: string[];
          plan_b_exercises: string[];
          group_id?: string | null;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          manager_id?: string;
          plan_a_exercises?: string[];
          plan_b_exercises?: string[];
          group_id?: string | null;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
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
  avatar_url: string | null;
  role: "manager" | "athlete";
  manager_id: string | null;
  group_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AthleteGroup {
  id: string;
  manager_id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CustomMetric {
  id: string;
  manager_id: string;
  title: string;
  description: string | null;
  type: "rating" | "text";
  created_at: string;
  updated_at: string;
}

export interface MetricResponse {
  id: string;
  athlete_id: string;
  metric_id: string;
  rating_value: number | null;
  text_value: string | null;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface DailyFormStatus {
  id: string;
  manager_id: string;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  global_reminder_time: string; // Format: "HH:MM" in 24-hour format
  enable_reminders: boolean;
  manually_closed?: boolean;
  created_at: string;
  updated_at?: string;
  date?: string;
}

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
  updated_at: string;
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

export interface ManagerInvitation {
  id: string;
  manager_id: string;
  athlete_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
}

export type AthleteManagerConnection = {
  id: string;
  athlete_id: string;
  manager_id: string;
  invitation_id: string;
  created_at: string;
  status: "active" | "inactive";
};

export type TrainingProgram = {
  id: string;
  manager_id: string;
  plan_a_exercises: string[];
  plan_b_exercises: string[];
  group_id: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type ExerciseRecord = {
  id: string;
  athlete_id: string;
  program_id: string;
  selected_plan: "A" | "B" | "none";
  exercise_name: string;
  weight: number | null;
  reps: number | null;
  date: string;
  created_at: string;
  series_data?: { weight: number; reps: number }[];
};

export type WeightRecord = {
  id: string;
  athlete_id: string;
  weight: number;
  date: string;
  created_at: string;
};
