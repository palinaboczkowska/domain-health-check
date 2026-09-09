import { z } from "zod";

function normalizeDomainInput(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes("://")) {
    try {
      return new URL(trimmed).hostname.toLowerCase();
    } catch {
      return trimmed.toLowerCase();
    }
  }
  return trimmed.toLowerCase();
}

// Dot-separated labels, alphanumeric + hyphen, no leading/trailing hyphen
// per label, TLD at least two alphabetic characters.
const HOSTNAME_PATTERN =
  /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*\.[a-z]{2,}$/;

export const domainSchema = z.preprocess(
  (input) => (typeof input === "string" ? normalizeDomainInput(input) : input),
  z
    .string()
    .max(253, "Domain is too long")
    .regex(HOSTNAME_PATTERN, "Doesn't look like a valid domain"),
);

/** Trims, lowercases, and unwraps a pasted full URL down to its hostname. */
export function parseDomain(input: unknown): string {
  return domainSchema.parse(input);
}
