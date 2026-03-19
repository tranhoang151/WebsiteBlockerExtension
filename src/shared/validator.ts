/**
 * Returns true if the input is a non-empty, non-whitespace string
 * that looks like a valid domain.
 */
export function isValidDomain(input: string): boolean {
  if (typeof input !== "string") return false;
  const trimmed = input.trim();
  if (trimmed.length === 0) return false;
  // After stripping protocol and trailing slash, must have at least one dot
  const normalized = normalizeDomain(trimmed);
  return normalized.length > 0 && normalized.includes(".");
}

/**
 * Normalizes a domain string:
 * - Lowercases
 * - Strips protocol (http://, https://, etc.)
 * - Strips trailing slashes
 */
export function normalizeDomain(input: string): string {
  let domain = input.trim().toLowerCase();
  // Remove protocol
  domain = domain.replace(/^[a-z][a-z0-9+\-.]*:\/\//, "");
  // Remove trailing slashes
  domain = domain.replace(/\/+$/, "");
  // Remove path after first slash
  const slashIndex = domain.indexOf("/");
  if (slashIndex !== -1) {
    domain = domain.substring(0, slashIndex);
  }
  return domain;
}
