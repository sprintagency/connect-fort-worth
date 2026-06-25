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
  is_live: boolean;
}

export interface Attendee {
  id: string;
  auth_uid: string;
  event_id: string | null;
  first_name: string;
  last_name: string;
  company: string | null;
  industry: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  open_to_contact: boolean;
  looking_for: string[];
  agreed_terms: boolean;
  created_at: string;
}
