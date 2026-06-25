/** Format keystrokes into a US phone mask: (XXX) XXX-XXXX. */
export function formatUsPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 10);
  if (d.length === 0) return "";
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** A complete US number has exactly 10 digits. */
export function isValidUsPhone(value: string): boolean {
  return value.replace(/\D/g, "").length === 10;
}
