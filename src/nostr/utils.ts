import { SimplePool } from "nostr-tools"
import type { NostrEvent } from 'nostr-tools';
import { NOSTR_PROJECT_KIND } from "src/constants";
import { nostrEventToProject } from "@services/nostr/projects.js";
import type { Project } from "@interfaces/project.js";

let pool: SimplePool | null = null; // Global pool instance
let relays: string[] = []; // Global list of relays

/**
 * Initialize the Nostr pool and relays.
 * @param relayUrls - Array of relay URLs to connect to.
 */
export async function initNostr(relayUrls: string[]): Promise<void> {
  if (!pool) {
    pool = new SimplePool();
    relays = relayUrls;

    // Connect to all relays
    for (const relay of relays) {
      try {
        await pool?.ensureRelay(relay); // Await the promise
        console.log(`Relay added: ${relay}`);
      } catch (error) {
        console.warn(`Failed to connect to relay ${relay}:`, error);
      }
    }
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


export async function getAllProjectsFromRelay(limit: number = 10): Promise<Project[]> {
  if (!pool || relays.length === 0) {
    throw new Error('Nostr is not initialized. Call initNostr() first.');
  }
  try {
    const events: NostrEvent[] = await pool.querySync(
      relays,
      {
        kinds: [NOSTR_PROJECT_KIND],
        limit: limit
      },
    )
    const projects: Project[] = [];

    events.forEach((event) => {
      try {
        const project = nostrEventToProject(event); // Convert event to project
        if (project) {
          projects.push(project); // Push the project onto the array
        }
      } catch (error) {
        console.warn(`Failed to convert event to project: ${event.id}`, error);
      }
    });

    return projects; // Return the array of projects
  } catch (error) {
    console.error("Failed to fetch events from any relay:", error);
    return [];
  }
}
