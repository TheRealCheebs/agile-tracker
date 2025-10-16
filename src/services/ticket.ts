import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { prismaTicketToData, type TicketData } from '../models/ticket-data';

// Placeholder for relay sync logic
async function syncWithRelay(): Promise<void> {
  // TODO: Implement relay sync logic here
  // This should fetch new events from the relay and update the local DB
}

export async function createTicket(
  project_uuid: string,
  type: string,
  title: string,
  description: string,
  ownerPubkey: string,
  parent_uuid?: string | null,
  children: string[] = []
): Promise<TicketData> {
  const uuid = uuidv4();
  const now = Date.now();
  return {
    uuid: uuid,
    project_uuid: project_uuid,
    type: type,
    title: title,
    description: description,
    state: 'unscheduled',
    parent_uuid: parent_uuid ?? null,
    owner_pubkey: ownerPubkey,
    created_at: now,
    updated_at: now,
    last_event_id: null,
    last_event_created_at: now,
    children_uuids: children
  };
}


export async function getTickets(
  prisma: PrismaClient,
  filter?: { state?: string }
): Promise<TicketData[]> {
  await syncWithRelay();
  const prismaTickets = await prisma.ticket.findMany({
    where: filter?.state ? { state: filter.state } : {},
    orderBy: { created_at: 'desc' }
  });
  return prismaTickets.map(prismaTicketToData);
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

export async function updateTicket(
  prisma: PrismaClient,
  uuid: string,
  updates: Partial<{
    title: string;
    description: string;
    state: string;
    parentUuid: string;
    ownerPubkey: string;
    children_uuid: string[]
  }>
): Promise<boolean> {
  // make sure we have the most updated ticket, if possible
  await syncWithRelay();

  const transaction = [];

  // Filter out null or undefined fields from the updates object
  const filteredUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, value]) => value != null) // Exclude null and undefined
  );

  if (Object.keys(filteredUpdates).length > 0) {
    transaction.push(
      prisma.ticket.update({
        where: { uuid },
        data: filteredUpdates,
      })
    );
  }

  // note: connect adds new references without impacting existing ones
  // disconnect removes references
  // set replaces all existing references with a new set.
  if (updates.children_uuid && updates.children_uuid.length > 0) {
    transaction.push(
      prisma.ticket.update({
        where: { uuid },
        data: {
          children: {
            connect: updates.children_uuid.map(childId => ({ uuid: childId })),
            // },
            // referencesTo: {
            //   connect: updates.children.map(childId => ({ uuid: childId })),
          }
        },
      })
    );


    // updates.children.forEach(childId => {
    //   transaction.push(
    //     prisma.ticket.update({
    //       where: { uuid: childId },
    //       data: {
    //         referencesFrom: {
    //           connect: { uuid: uuid },
    //         },
    //       },
    //     })
    //   );
    // });
  }
  // Execute the transaction
  try {
    await prisma.$transaction(transaction);
    return true;
  } catch (error) {
    console.error('Error updating ticket:', error);
    return false;
  }
}

export async function deleteTicket(
  prisma: PrismaClient,
  uuid: string
): Promise<boolean> {
  const result = await prisma.ticket.deleteMany({ where: { uuid } });
  return result.count > 0;
}
