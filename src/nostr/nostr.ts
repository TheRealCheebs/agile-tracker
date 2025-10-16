import { SimplePool, finalizeEvent, verifyEvent } from 'nostr-tools';
import 'websocket-polyfill'; // Required for Node.js

const pool = new SimplePool();
const relays = ['wss://localhost:7000'];

// Event kind for our tracker
const TRACKER_KIND = 30402; // Custom event kind

export interface NostrTicketEvent {
  id: string;
  pubkey: string;
  created_at: number;
  content: string;
  tags: string[][];
  sig: string;
  kind: number;
}

  privateKey: Uint8Array,
  ticketUuid: string,
  projectUuid: string,
  status: string,
  content: string
) {
export async function publishTicketUpdate(
  privateKey: Uint8Array,
  ticketUuid: string,
  projectUuid: string,
  status: string,
  content: string
) {
  const event = finalizeEvent(
    {
      kind: TRACKER_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['d', ticketUuid],
        ['project', projectUuid],
        ['status', status]
      ],
      content
    },
    privateKey
  );

  return Promise.all(pool.publish(relays, event));
}
// Subscribe to all ticket updates for a project
export function subscribeToProjectUpdates(projectUuid: string, callback: (event: NostrTicketEvent) => void) {
  const filter = {
    kinds: [TRACKER_KIND],
    '#project': [projectUuid]
  };

  const sub = pool.subscribeMany(relays, filter, {
    onevent(event: any) {
      callback(event as NostrTicketEvent);
    }
  });

  return () => sub.close();
}

export function verifyEventAuth(event: NostrTicketEvent, ownerPubkey: string): boolean {
  return verifyEvent(event) && event.pubkey === ownerPubkey;
}

export function subscribeToTicketUpdates(ticketUuid: string, callback: (event: NostrTicketEvent) => void) {
  const filter = {
    kinds: [TRACKER_KIND],
    '#d': [ticketUuid]
  };

  const sub = pool.subscribeMany(relays, filter, {
    onevent(event: any) {
      callback(event as NostrTicketEvent);
    }
  });

  return () => sub.close();
}
