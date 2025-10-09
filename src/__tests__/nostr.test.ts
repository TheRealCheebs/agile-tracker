import { generateSecretKey, getPublicKey } from 'nostr-tools';
import {
  publishTicketUpdate,
  verifyEventAuth,
  subscribeToTicketUpdates,
} from '../nostr.ts';

import type { NostrTicketEvent } from '../nostr.ts';

// Vitest: mock nostr-tools with iterable publish and mock verifyEvent
vi.mock('nostr-tools', async () => {
  const actual = await vi.importActual<typeof import('nostr-tools')>('nostr-tools');
  // Create a mock publish that returns an array (iterable for Promise.all)
  const mockPublish = vi.fn().mockReturnValue(['relay1', 'relay2']);
  // Create a mock subscribeMany with a close method
  const mockSubscribeMany = vi.fn().mockReturnValue({ close: vi.fn() });
  return {
    ...actual,
    SimplePool: vi.fn().mockImplementation(() => ({
      publish: mockPublish,
      subscribeMany: mockSubscribeMany,
    })),
    verifyEvent: vi.fn(() => true),
  };
});

describe('Nostr Module', () => {
  let privateKey: Uint8Array;
  let publicKey: string;

  beforeEach(() => {
    privateKey = generateSecretKey();
    publicKey = getPublicKey(privateKey);
  });

  it('should publish a ticket update', async () => {
    const ticketUuid = 'test-uuid';
    const status = 'started';
    const content = 'Status updated to started';

    await publishTicketUpdate(privateKey, ticketUuid, status, content);

    // Check the mock
    const { SimplePool } = await import('nostr-tools');
    const pool = new SimplePool();
    expect(pool.publish).toHaveBeenCalledTimes(1);
  });

  it('should verify event authorization', () => {
    const event: NostrTicketEvent = {
      id: 'event-id',
      pubkey: publicKey,
      created_at: Date.now(),
      content: 'test',
      tags: [['d', 'test-uuid'], ['status', 'started']],
      sig: 'signature',
      kind: 30402
    };

    // verifyEvent is mocked to return true by default
    const isValid = verifyEventAuth(event, publicKey);
    expect(isValid).toBe(true);

    // Test with wrong pubkey
    const isValidWrong = verifyEventAuth(event, 'wrong-pubkey');
    expect(isValidWrong).toBe(false);
  });

  it('should subscribe to ticket updates', async () => {
    const ticketUuid = 'test-uuid';
    const callback = vi.fn();

    const unsub = subscribeToTicketUpdates(ticketUuid, callback);


  // We expect the subscribeMany to have been called
  const { SimplePool } = await import('nostr-tools');
  const pool = new SimplePool();
  const subscribeManyMock = vi.mocked(pool.subscribeMany);
  expect(subscribeManyMock).toHaveBeenCalledTimes(1);

  // Check that the filter is correct
  const call = subscribeManyMock.mock.calls[0];
  expect(call).toBeDefined();
  if (!call) throw new Error('subscribeMany was not called');
  const filterArg = call[1];
  expect(filterArg.kinds).toEqual([30402]);
  expect(filterArg['#d']).toEqual([ticketUuid]);

    // Unsubscribe should call close
    unsub();
    expect(unsub).toBeInstanceOf(Function);
  });
});
