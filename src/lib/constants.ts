// Industry list - matches the prototype's signup select + directory filter.
export const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Financial Services",
  "Construction",
  "Commercial Real Estate",
  "Marketing",
  "AI / Machine Learning",
  "Energy",
  "Legal",
  "SaaS",
] as const;

// "What are you looking for?" chips.
export const LOOKING_FOR = [
  "New clients",
  "Partners",
  "Vendors",
  "Investors",
  "Hiring",
  "Networking",
] as const;

// Gradient pairs for initials avatars (matches the prototype palette).
export const AVATAR_GRADIENTS: [string, string][] = [
  ["#F0531F", "#D8461A"],
  ["#1B4476", "#0B2A4A"],
  ["#19A974", "#0E7C56"],
  ["#6C4FD8", "#43308F"],
  ["#E0851F", "#B8650F"],
  ["#2D9CDB", "#1565A8"],
];

export function initials(first: string, last: string): string {
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase();
}

/** Stable gradient for an attendee, keyed by a string id so it never flickers. */
export function avatarGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const [a, b] = AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}
