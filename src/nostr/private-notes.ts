import { nip44 } from 'nostr-tools';
import type { ProjectMember } from './project.js';
import type { Ticket } from './ticket.js';
import type { UserKeys } from './identity.js';
import { randomBytes } from '@noble/hashes/utils'; // or use crypto.getRandomValues in browser

// Creating a private ticket event
async function createPrivateTicketEvent(userKeys: UserKeys, ticketData: Ticket, projectMembers: ProjectMember[]) {
  // Create the base event
  const event = {
    kind: 30002,  // Custom ticket kind
    content: '',
    tags: [
      ['d', ticketData.uuid],
      ['project', ticketData.project_uuid],
      ['title', ticketData.title],
      // ... other tags
    ]
  };

  // Create a rumor (NIP-17)
  const rumor = {
    kind: 14,
    content: JSON.stringify(event),
    tags: []
  };

  // Create gift wraps for each member
  const wraps = [];
  for (const member of projectMembers) {
    const converKey = nip44.getConversationKey(userKeys.privateKey, member.pubkey);  // Ensure conversation key exists
    const nonce = randomBytes(24); // 24 random bytes
    const wrap = {
      kind: 1059,  // Gift wrap
      content: await nip44.encrypt(JSON.stringify(rumor), converKey, nonce),
      tags: [['p', member]]
    };
    wraps.push(wrap);
  }

  // Publish all wraps
  for (const wrap of wraps) {
    await publishToRelays(wrap);
  }

  return wraps;
}
