import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import type { Ticket as PrismaTicket } from '@prisma/client';

export interface Ticket {
  id?: number;
  uuid: string;
  title: string;
  description?: string;
  status: 'backlog' | 'started' | 'finished' | 'delivered' | 'accepted' | 'rejected';
  assignee?: string;
  created_at: number;
  updated_at: number;
  owner_pubkey: string;
}

export async function createTicket(
  prisma: PrismaClient,
  title: string,
  description: string,
  ownerPubkey: string
): Promise<PrismaTicket> {
  const uuid = uuidv4();
  const now = Date.now();
  return await prisma.ticket.create({
    data: {
      uuid,
      title,
      description,
      status: 'backlog',
      created_at: now,
      updated_at: now,
      owner_pubkey: ownerPubkey
    }
  });
}

export async function getTickets(
  prisma: PrismaClient,
  filter?: { status?: string }
): Promise<PrismaTicket[]> {
  return await prisma.ticket.findMany({
    where: filter?.status ? { status: filter.status } : {},
    orderBy: { created_at: 'desc' }
  });
}

export async function updateTicketStatus(
  prisma: PrismaClient,
  uuid: string,
  status: string
): Promise<boolean> {
  const now = Date.now();
  const result = await prisma.ticket.updateMany({
    where: { uuid },
    data: { status, updated_at: now }
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
