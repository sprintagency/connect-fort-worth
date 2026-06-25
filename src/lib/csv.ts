import type { Attendee } from "./types";

const HEADERS = [
  "First name",
  "Last name",
  "Company",
  "Job title",
  "Industry",
  "Phone",
  "Email",
  "Offering",
  "Open to contact",
  "Looking for",
  "Joined",
];

function cell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build a CSV string from attendee rows. */
export function attendeesToCsv(rows: Attendee[]): string {
  const lines = [HEADERS.join(",")];
  for (const a of rows) {
    lines.push(
      [
        a.first_name,
        a.last_name,
        a.company,
        a.job_title,
        a.industry,
        a.phone,
        a.email,
        a.offering,
        a.open_to_contact ? "yes" : "no",
        (a.looking_for ?? []).join("; "),
        a.created_at,
      ]
        .map(cell)
        .join(","),
    );
  }
  return lines.join("\r\n");
}
