import { SimplePool } from 'nostr-tools';
import type { Event, Filter } from 'nostr-tools/lib/types';
import type { SubCloser } from 'nostr-tools/lib/types/abstract-pool';
import { PROJECT_KIND, TICKET_KIND } from './nostr-delegation-constants.js';

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
 * @param onMembershipUpdate - Callback for membership update events
 * @returns SubCloser (subscription object)
 */
export function subscribeToProjectUpdates(
  relays: string[],
  projectUuid: string,
  lastSyncTime: number | null,
  onProjectEvent: (event: Event) => void,
  onTicketUpdate: (ticketEvent: Event) => void,
  onMembershipUpdate: (memberEvent: Event) => void
): SubCloser {
  const filter = {
    kinds: [PROJECT_KIND],
    '#project': [projectUuid],
    since: lastSyncTime || Math.floor(Date.now() / 1000)
  };

  async function handleProjectEvent(event: Event) {
    onProjectEvent(event);

    // Check for updated ticket/member tags
    const updatedEvent = getTagValue(event, 'updated');
    const updatedProperty = getTagValue(event, 'property');

    // If the event references an updated ticket, fetch it from Nostr and emit via callback
    if (updatedEvent.length && updatedProperty.includes('ticket')) {
      const ticketUuid = updatedEvent[0]!;
      const ticketFilter: Filter = {
        kinds: [TICKET_KIND],
        '#d': [ticketUuid]
      };
      const pool = new SimplePool();
      const ticketEvents = await pool.querySync(relays, ticketFilter);
      if (ticketEvents.length && ticketEvents[0]) {
        onTicketUpdate(ticketEvents[0]);
      }
    } else if (updatedEvent.length && updatedProperty.includes('membership')) {
      // maybe this is just done on the onPrjoectEvent?
      // otherwise we should call the onMembershipUpdate()
      onMembershipUpdate(event)
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
