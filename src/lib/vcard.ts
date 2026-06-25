import type { Attendee } from "./types";

type VCardInput = Pick<
  Attendee,
  "first_name" | "last_name" | "company" | "industry" | "phone" | "email"
>;

/** Escape per vCard 3.0 (commas, semicolons, backslashes, newlines). */
function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Build a valid vCard 3.0 string. */
export function buildVCard(a: VCardInput): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(a.last_name)};${esc(a.first_name)};;;`,
    `FN:${esc(`${a.first_name} ${a.last_name}`.trim())}`,
  ];
  if (a.company) lines.push(`ORG:${esc(a.company)}`);
  if (a.industry) lines.push(`TITLE:${esc(a.industry)}`);
  if (a.phone) lines.push(`TEL;TYPE=CELL:${esc(a.phone)}`);
  if (a.email) lines.push(`EMAIL:${esc(a.email)}`);
  lines.push("NOTE:Met at Access Fort Worth · Connect Fort Worth");
  lines.push("END:VCARD");
  // vCard spec wants CRLF line breaks.
  return lines.join("\r\n");
}

/** Trigger a .vcf download in the browser. */
export function downloadVCard(a: VCardInput) {
  if (typeof window === "undefined") return;
  const blob = new Blob([buildVCard(a)], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${a.first_name}_${a.last_name}.vcf`.replace(/\s+/g, "_");
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
