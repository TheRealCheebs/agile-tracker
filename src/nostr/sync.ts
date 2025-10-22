import { SimplePool } from 'nostr-tools';
import type { Event, Filter } from 'nostr-tools/lib/types';
import type { SubCloser } from 'nostr-tools/lib/types/abstract-pool';
import { NOSTR_GIFT_WRAP_KIND, NOSTR_PROJECT_KIND, NOSTR_TICKET_KIND } from './../constants.ts';
import { nostrEventToProject, getPrivateProject } from '../services/nostr/projects.js';
import type { Project } from '../interfaces/project.js';
import type { UserKeys } from '../interfaces/identity.js';

// Helper to extract tag values from a Nostr event
export function getTagValue(event: Event, tag: string): string[] {
  return event.tags
    .filter(t => t[0] === tag && typeof t[1] === 'string')
    .map(t => t[1] as string);
}

/**
 * Subscribe to project updates and emit ticket updates via callback.
 *
 * @param relays - Array of relay URLs
 * @param projectUuid - The project UUID to watch
 * @param lastSyncTime - Timestamp for incremental sync
 * @param onProjectEvent - Callback for project events
 * @param onTicketUpdate - Callback for ticket update events
 * @returns SubCloser (subscription object)
 */
export function subscribeToPrivateProjectUpdates(
  relays: string[],
  projectUuid: string,
  lastSyncTime: number | null,
  userKeys: UserKeys,
  onProjectEvent: (project: Project) => void,
  onTicketUpdate: (ticketEvent: Event) => void,
): SubCloser {
  const filter = {
    kinds: [NOSTR_GIFT_WRAP_KIND],
    ['#project-uuid']: [projectUuid],
    ['#type']: ['project'],
    ['#p']: [userKeys.pubKey],
    since: lastSyncTime || Math.floor(Date.now() / 1000)
  };

  async function handleProjectEvent(event: Event) {
    // Check for updated ticket/member tags
    const updatedEvent = getTagValue(event, 'updated');
    const updatedProperty = getTagValue(event, 'property');

    const privateProject = await getPrivateProject(event, userKeys);
    onProjectEvent(privateProject);
    // If the event references an updated ticket, fetch it from Nostr and emit via callback
    if (updatedEvent.length && updatedProperty.includes('ticket')) {
      const ticketUuid = updatedEvent[0]!;
      const ticketFilter: Filter = {
        kinds: [NOSTR_TICKET_KIND],
        '#d': [ticketUuid]
      };
      const pool = new SimplePool();
      const ticketEvents = await pool.querySync(relays, ticketFilter);
      if (ticketEvents.length && ticketEvents[0]) {
        onTicketUpdate(ticketEvents[0]);
      }
    }
    // TODO: the same for project members updates
  }

  return new SimplePool().subscribeMany(
    relays,
    filter,
    {
      onevent: (event: Event) => { void handleProjectEvent(event); },
      onclose: (reasons: any) => console.log('Subscription closed:', reasons)
    }
  );
}
/**
 * Subscribe to project updates and emit ticket updates via callback.
 *
 * @param relays - Array of relay URLs
 * @param projectUuid - The project UUID to watch
 * @param lastSyncTime - Timestamp for incremental sync
 * @param onProjectEvent - Callback for project events
 * @param onTicketUpdate - Callback for ticket update events
 * @returns SubCloser (subscription object)
 */
export function subscribeToProjectUpdates(
  relays: string[],
  projectUuid: string,
  lastSyncTime: number | null,
  onProjectEvent: (project: Project) => void,
  onTicketUpdate: (ticketEvent: Event) => void,
): SubCloser {
  const filter = {
    kinds: [NOSTR_PROJECT_KIND],
    '#project-uuid': [projectUuid],
    since: lastSyncTime || Math.floor(Date.now() / 1000)
  };

  async function handleProjectEvent(event: Event) {
    // Check for updated ticket/member tags
    const updatedEvent = getTagValue(event, 'updated');
    const updatedProperty = getTagValue(event, 'property');

    const projectUpdate = nostrEventToProject(event);
    onProjectEvent(projectUpdate);

    // If the event references an updated ticket, fetch it from Nostr and emit via callback
    if (updatedEvent.length && updatedProperty.includes('ticket')) {
      const ticketUuid = updatedEvent[0]!;
      const ticketFilter: Filter = {
        kinds: [NOSTR_TICKET_KIND],
        '#d': [ticketUuid]
      };
      const pool = new SimplePool();
      const ticketEvents = await pool.querySync(relays, ticketFilter);
      if (ticketEvents.length && ticketEvents[0]) {
        onTicketUpdate(ticketEvents[0]);
      }
    }
    // TODO: the same for project members updates
  }

  return new SimplePool().subscribeMany(
    relays,
    filter,
    {
      onevent: (event: Event) => { void handleProjectEvent(event); },
      onclose: (reasons: any) => console.log('Subscription closed:', reasons)
    }
  );
}
