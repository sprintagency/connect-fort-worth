const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Format a YYYY-MM-DD event date without Date() timezone drift. */
export function formatEventDate(d: string | null): string {
  if (!d) return "TBA";
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return d;
  return `${MONTHS[m - 1]} ${day}, ${y}`;
}
