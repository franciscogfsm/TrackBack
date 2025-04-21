export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  manager_id: string | null;
}

export interface ManagerInvitation {
  id: number;
  created_at: string;
  invitation_code: string;
  manager_id: string;
  status: "pending" | "accepted" | "expired";
  expires_at: string;
}

export interface InvitationWithEmail {
  id: number;
  invitation_code: string;
  manager_id: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  manager_email: string;
  manager_name: string;
}

export interface MetricResponseWithDetails {
  id: string;
  created_at: string;
  athlete_id: string;
  metric_id: string;
  numeric_value?: number;
  text_response?: string;
  athlete: {
    id: string;
    full_name: string;
    email: string;
  };
  metric: {
    id: string;
    title: string;
    type: "numeric" | "text" | "rating";
    description?: string;
  };
}

export type FormStatus = "idle" | "loading" | "success" | "error";

export interface Invitation {
  id: string;
  created_at: string;
  invitation_code: string;
  manager_id: string;
  athlete_id?: string;
  status: "pending" | "accepted" | "expired";
  expires_at: string;
  manager?: {
    id: string;
    full_name: string;
    email: string;
  };
  athlete?: {
    id: string;
    full_name: string;
    email: string;
  };
}
