import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import type { Ticket as PrismaTicket } from '@prisma/client';


// Updated Ticket interface to match new Prisma Ticket model
export interface Ticket {
  id?: number;
  uuid: string;
  project_id: number;
  type: 'epic' | 'story' | 'task' | 'bug' | 'feature';
  title: string;
  description?: string;
  state: 'unscheduled' | string;
  parent_id?: number | null;
  owner_pubkey?: string | null;
  created_at: number;
  updated_at: number;
  last_event_id?: string | null;
  last_event_created_at?: number | null;
}

export async function createTicket(
  prisma: PrismaClient,
  project_id: number,
  type: 'epic' | 'story' | 'task' | 'bug' | 'feature',
  title: string,
  description: string,
  ownerPubkey: string,
  parent_id?: number | null
): Promise<PrismaTicket> {
  const uuid = uuidv4();
  const now = Date.now();
  return await prisma.ticket.create({
    data: {
      uuid,
      project_id,
      type,
      title,
      description,
      state: 'unscheduled',
      parent_id: parent_id ?? null,
  owner_pubkey: ownerPubkey,
      created_at: now,
      updated_at: now
    }
  });
}

export async function getTickets(
  prisma: PrismaClient,
  filter?: { state?: string }
): Promise<PrismaTicket[]> {
  return await prisma.ticket.findMany({
    where: filter?.state ? { state: filter.state } : {},
    orderBy: { created_at: 'desc' }
  });
}

export async function updateTicketState(
  prisma: PrismaClient,
  uuid: string,
  state: string
): Promise<boolean> {
  const now = Date.now();
  const result = await prisma.ticket.updateMany({
    where: { uuid },
    data: { state, updated_at: now }
  });
  return result.count > 0;
}

export async function deleteTicket(
  prisma: PrismaClient,
  uuid: string
): Promise<boolean> {
  const result = await prisma.ticket.deleteMany({ where: { uuid } });
  return result.count > 0;
}
