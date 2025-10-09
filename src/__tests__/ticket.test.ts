import {
  createTicket,
  getTickets,
  updateTicketStatus,
  deleteTicket
} from '../ticket';
import { PrismaClient } from '@prisma/client';

describe('Ticket Model', () => {
  const testPubkey = 'test-pubkey-123';
  let prisma: PrismaClient;

  beforeEach(async () => {
    prisma = new PrismaClient();
    // Clean up tickets table before each test
    await prisma.ticket.deleteMany();
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  it('should create a ticket', async () => {
    const ticket = await createTicket(prisma, 'Test Ticket', 'Test Description', testPubkey);

    expect(ticket.title).toBe('Test Ticket');
    expect(ticket.description).toBe('Test Description');
    expect(ticket.status).toBe('backlog');
    expect(ticket.owner_pubkey).toBe(testPubkey);
    expect(ticket.uuid).toBeDefined();
    expect(ticket.created_at).toBeGreaterThan(0);
    expect(ticket.updated_at).toBeGreaterThan(0);
  });

  it('should retrieve all tickets', async () => {
    await createTicket(prisma, 'Ticket 1', 'Description 1', testPubkey);
    await createTicket(prisma, 'Ticket 2', 'Description 2', testPubkey);

    const tickets = await getTickets(prisma);
  expect(tickets.length).toBe(2);
  expect(tickets[0]).toBeDefined();
  expect(tickets[1]).toBeDefined();
  expect(tickets[0]!.title).toBe('Ticket 2'); // Ordered by created_at DESC
  expect(tickets[1]!.title).toBe('Ticket 1');
  });

  it('should filter tickets by status', async () => {
    await createTicket(prisma, 'Ticket 1', 'Description 1', testPubkey);
    const ticket2 = await createTicket(prisma, 'Ticket 2', 'Description 2', testPubkey);
    await updateTicketStatus(prisma, ticket2.uuid, 'started');

    const backlogTickets = await getTickets(prisma, { status: 'backlog' });
  expect(backlogTickets.length).toBe(1);
  expect(backlogTickets[0]).toBeDefined();
  expect(backlogTickets[0]!.title).toBe('Ticket 1');

  const startedTickets = await getTickets(prisma, { status: 'started' });
  expect(startedTickets.length).toBe(1);
  expect(startedTickets[0]).toBeDefined();
  expect(startedTickets[0]!.title).toBe('Ticket 2');
  });

  it('should update ticket status', async () => {
    const ticket = await createTicket(prisma, 'Test Ticket', 'Test Description', testPubkey);
    const originalUpdatedAt = ticket.updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));
    const updated = await updateTicketStatus(prisma, ticket.uuid, 'started');
    expect(updated).toBe(true);

    const tickets = await getTickets(prisma);
  expect(tickets.length).toBeGreaterThan(0);
  expect(tickets[0]).toBeDefined();
  expect(tickets[0]!.status).toBe('started');
  expect(tickets[0]!.updated_at).toBeGreaterThan(originalUpdatedAt);
  });

  it('should delete a ticket', async () => {
    const ticket = await createTicket(prisma, 'Test Ticket', 'Test Description', testPubkey);

    let tickets = await getTickets(prisma);
    expect(tickets.length).toBe(1);

    const deleted = await deleteTicket(prisma, ticket.uuid);
    expect(deleted).toBe(true);

    tickets = await getTickets(prisma);
    expect(tickets.length).toBe(0);
  });

  it('should handle invalid ticket operations', async () => {
    // Update non-existent ticket
    const updated = await updateTicketStatus(prisma, 'non-existent-uuid', 'started');
    expect(updated).toBe(false);

    // Delete non-existent ticket
    const deleted = await deleteTicket(prisma, 'non-existent-uuid');
    expect(deleted).toBe(false);
  });
});
