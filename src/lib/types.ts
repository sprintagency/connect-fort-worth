export type Role = "attendee" | "admin" | "superadmin";

export type ActionType =
  | "signup"
  | "photo_uploaded"
  | "profile_view"
  | "search"
  | "sms_click"
  | "vcard_download";

export interface EventRow {
  id: string;
  name: string;
  event_date: string | null;
  venue: string | null;
  sponsor_name: string | null;
  sponsor_logo_url: string | null;
  sponsor_url: string | null;
  is_live: boolean;
}

export interface Attendee {
  id: string;
  auth_uid: string;
  event_id: string | null;
  first_name: string;
  last_name: string;
  company: string | null;
  job_title: string | null;
  industry: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  open_to_contact: boolean;
  looking_for: string[];
  offering: string | null;
  agreed_terms: boolean;
  created_at: string;
}

/**
 * Persistent member record (1:1 with auth.users). This is the "memory" that
 * carries across events. A check-in (Attendee row) is a per-event snapshot of
 * these fields.
 */
export interface Profile {
  id: string;
  role: Role;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  job_title: string | null;
  industry: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  open_to_contact: boolean;
  looking_for: string[];
  offering: string | null;
  agreed_terms: boolean;
  created_at: string;
}
