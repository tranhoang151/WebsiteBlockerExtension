import { type ExtensionState } from "./storage";
import { isValidDomain, normalizeDomain } from "./validator";

/**
 * Adds a domain to the blocklist after validating and normalizing it.
 * Returns the updated state, or an error message if the domain is invalid or duplicate.
 */
export function addDomain(
  state: ExtensionState,
  domain: string
): { state: ExtensionState; error?: string } {
  if (!isValidDomain(domain)) {
    return { state, error: "Invalid domain" };
  }
  const normalized = normalizeDomain(domain);
  if (state.blocklist.includes(normalized)) {
    return { state, error: "Domain already blocked" };
  }
  return {
    state: { ...state, blocklist: [...state.blocklist, normalized] },
  };
}

/**
 * Removes a domain from the blocklist.
 * If the domain is not present, returns the state unchanged.
 */
export function removeDomain(
  state: ExtensionState,
  domain: string
): ExtensionState {
  const normalized = normalizeDomain(domain);
  return {
    ...state,
    blocklist: state.blocklist.filter((d) => d !== normalized),
  };
}

/**
 * Toggles the enabled flag of the extension state.
 */
export function toggleEnabled(state: ExtensionState): ExtensionState {
  return { ...state, enabled: !state.enabled };
}
