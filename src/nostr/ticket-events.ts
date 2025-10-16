import { getPublicKey, signEvent, nip26, generatePrivateKey } from 'nostr-tools';
import type { Ticket } from 'ticket.js';
import {
  NOSTR_DELEGATION_KIND_TICKET,
  getDelegationSince,
  getDelegationUntil
} from './nostr-delegation-constants.js';

// Types
export type UserKeys = {
  pubkey: string;
  privateKey: Uint8Array;
};

export type TicketData = {
  uuid: string;
  projectUuid: string;
  title: string;
  description?: string;
  state: string;
  // ...other fields
};

// Create a new ticket as a NIP-33 parameterized replaceable event, with NIP-26 delegation
export async function createTicketNostrEvent({
  ticket,
  projectPubkey,
  delegatorPrivkey,
  delegateePrivkey,
}: {
  ticket: Ticket;
  projectPubkey: string;
  delegatorPrivkey: Uint8Array;
  delegateePrivkey: Uint8Array;
}) {
  // 1. Create delegation token (delegator -> delegatee)
  const delegation = nip26.createDelegation(
    delegatorPrivkey,
    getPublicKey(delegateePrivkey),
    {
      kind: NOSTR_DELEGATION_KIND_TICKET,
      since: getDelegationSince(),
      until: getDelegationUntil()
    }
  );

  // 2. Create the ticket event (kind 30001, d:ticket-uuid)
  const event = {
    kind: NOSTR_DELEGATION_KIND_TICKET,
    pubkey: getPublicKey(delegateePrivkey),
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', ticket.uuid],
      ['project', ticket.projectUuid],
      ['delegation', delegation.from, delegation.cond, delegation.sig],
    ],
    content: JSON.stringify(ticket),
  };
  const signed = signEvent(event, delegateePrivkey);
  return signed;
}

// Update an existing ticket (same as create, just publish a new event with same kind/d tag)
export async function updateTicketNostrEvent(args: Parameters<typeof createTicketNostrEvent>[0]) {
  return createTicketNostrEvent(args);
}

// Revoke a user's delegation (remove their ability to edit project/tickets)
// To revoke, simply do NOT issue a new delegation token for that user.
// Optionally, publish a new project event with updated member list.
export async function revokeProjectAccess({
  projectUuid,
  delegatorPrivkey,
  updatedMembers,
}: {
  projectUuid: string;
  delegatorPrivkey: Uint8Array;
  updatedMembers: { pubkey: string; role: string }[];
}) {
  // Optionally, publish a new project event (kind 30000, d:projectUuid) with updated members
  const event = {
    kind: 30000,
    pubkey: getPublicKey(delegatorPrivkey),
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', projectUuid],
      ...updatedMembers.map(m => ['member', m.pubkey, m.role]),
    ],
    content: JSON.stringify({ members: updatedMembers }),
  };
  const signed = signEvent(event, delegatorPrivkey);
  return signed;
}

// Usage:
// 1. To create a ticket, call createTicketNostrEvent with the ticket data, project pubkey, delegator (project) privkey, and delegatee (user) privkey.
// 2. To update a ticket, call updateTicketNostrEvent (same args).
// 3. To revoke access, call revokeProjectAccess with the new member list (excluding the revoked user).
