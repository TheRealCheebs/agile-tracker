import { PrismaClient } from '@prisma/client';
import type { Project as PrismaProject } from '@prisma/client';
import type { Project } from '../../interfaces/project.js';

export async function saveNewProject(
  prisma: PrismaClient,
  project: Project
): Promise<PrismaProject> {

  // lastEventId and lastEventCreatedAt should be null on new events
  // tickets will also be empty on a brand new project.
  const {
    uuid,
    name,
    description,
    isPrivate,
    createdAt,
    members,
  } = project;

  return await prisma.project.create({
    data: {
      uuid,
      name,
      description,
      is_private: isPrivate,
      created_at: createdAt,
      last_event_id: "",
      last_event_created_at: createdAt,
      members: {
        create: members.map((member) => ({
          pubkey: member.pubKey,
          role: member.role,
          created_at: member.createdAt,
        })),
      },
    },
  });
}

export async function getProjects(prisma: PrismaClient, pubKey: string): Promise<PrismaProject[]> {
  return await prisma.project.findMany({
    where: {
      OR: [
        {
          members: {
            some: {
              pubkey: pubKey, // pubkey needs to be a member
            },
          },
        },
        {
          is_private: false, // or the project is public and it's been loaded
        },
      ],
    },
    orderBy: { created_at: 'desc' }
  });
}

export async function getProjectById(prisma: PrismaClient, uuid: string): Promise<PrismaProject | null> {
  return await prisma.project.findUnique({
    where: { uuid }
  });
}

export async function deleteProject(prisma: PrismaClient, uuid: string): Promise<void> {
  await prisma.project.delete({
    where: { uuid }
  });
}

export async function updateProject(
  prisma: PrismaClient,
  project: Project
): Promise<void> {
  const {
    uuid,
    name,
    description,
    isPrivate,
    createdAt,
    lastEventId,
    lastEventCreatedAt,
    members,
    tickets,
  } = project;

  // TODO: make sure all of the ticket uuids passed in are valid before doing
  // the set on the ticket mapping. (they need to exist in the database.)

  await prisma.project.update({
    where: { uuid },
    data: {
      name,
      description,
      is_private: isPrivate,
      created_at: createdAt,
      last_event_id: lastEventId,
      last_event_created_at: lastEventCreatedAt,
      members: {
        deleteMany: {}, // Remove all existing members
        create: members.map((member) => ({
          pubkey: member.pubKey,
          role: member.role,
          created_at: member.createdAt,
        })),
      },
      tickets: {
        set: tickets.map((ticketUuid) => ({ uuid: ticketUuid })), // Update ticket relationships
      },
    },
  });
}
