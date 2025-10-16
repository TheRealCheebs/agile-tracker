// nostr-delegation-constants.ts
// Define your custom kinds
export const PROJECT_KIND = 34020;  // Parameterized replaceable
export const TICKET_KIND = 34021;   // Parameterized replaceable
export const NOSTR_DELEGATION_KIND_TICKET = 30001;
export const NOSTR_DELEGATION_VALIDITY_SKEW = 60; // seconds (1 minute)
export const NOSTR_DELEGATION_VALIDITY_PERIOD = 31536000; // seconds (1 year)

export function getDelegationSince(now: number = Date.now()): number {
  return Math.floor(now / 1000) - NOSTR_DELEGATION_VALIDITY_SKEW;
}

export function getDelegationUntil(now: number = Date.now()): number {
  return Math.floor(now / 1000) + NOSTR_DELEGATION_VALIDITY_PERIOD;
}
