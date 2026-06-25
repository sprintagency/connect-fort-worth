import type { Attendee } from "./types";

/** Normalize to an E.164-ish dial string (US default). */
export function toDialString(phone: string | null): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return digits ? `+${digits}` : "";
}

/** sms: href with a friendly prefilled body, matching the prototype's intent. */
export function buildSmsHref(attendee: Pick<Attendee, "first_name" | "phone">) {
  const dial = toDialString(attendee.phone);
  const body = encodeURIComponent(
    `Hi ${attendee.first_name}, I found you on Connect Fort Worth and would love to say hello. Where are you in the room?`,
  );
  // The "?&body=" form is the cross-platform hack the prototype used.
  return `sms:${dial}?&body=${body}`;
}
