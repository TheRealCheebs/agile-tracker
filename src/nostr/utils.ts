import { SimplePool } from "nostr-tools"
import type { NostrEvent } from 'nostr-tools';

let pool: SimplePool | null = null; // Global pool instance
let relays: string[] = []; // Global list of relays

/**
 * Initialize the Nostr pool and relays.
 * @param relayUrls - Array of relay URLs to connect to.
 */
export function initNostr(relayUrls: string[]): void {
  if (!pool) {
    pool = new SimplePool();
    relays = relayUrls;

    // Connect to all relays
    relays.forEach((relay) => {
      pool?.ensureRelay(relay);
      console.log(`Relay added: ${relay}`);
    });

    console.log('Nostr initialized with relays:', relays);
  } else {
    console.warn('Nostr is already initialized.');
  }
}

/**
 * Publish an event to all configured relays.
 * @param event - The Nostr event to publish.
 */
export async function publishToRelays(event: NostrEvent): Promise<void> {
  if (!pool || relays.length === 0) {
    throw new Error('Nostr is not initialized. Call initNostr() first.');
  }
  try {
    // Publish to all relays and resolve as soon as one succeeds
    await Promise.any(pool.publish(relays, event));
    console.log('Event published successfully to at least one relay.');
  } catch (error) {
    console.error('Failed to publish event to any relay:', error);
  }
}

/**
 * Close all relay connections.
 */
export function closeNostr(): void {
  if (pool) {
    pool.close(relays);
    pool = null;
    relays = [];
    console.log('Nostr pool closed and relays cleared.');
  } else {
    console.warn('Nostr pool is not initialized.');
  }
}
