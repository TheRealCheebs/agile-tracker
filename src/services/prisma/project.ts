import { PrismaClient } from '@prisma/client';
import type { Project as PrismaProject, ProjectMember as PrismaProjectMember } from '@prisma/client';
import type { Project, ProjectMember } from '@interfaces/project.js';

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

export async function getTicketUuidsByProjectUuid(prisma: PrismaClient, projectUuid: string): Promise<string[]> {
  try {
    // Fetch the project with its tickets
    const project = await prisma.project.findUnique({
      where: { uuid: projectUuid },
      include: {
        tickets: {
          select: {
            uuid: true, // Only fetch the UUIDs of the tickets
          },
        },
      },
    });

    // If the project doesn't exist, return an empty array
    if (!project) {
      console.warn(`Project with UUID ${projectUuid} not found.`);
      return [];
    }

    // Map the tickets to extract their UUIDs
    return project.tickets.map((ticket) => ticket.uuid);
  } catch (error) {
    console.error("Error fetching ticket UUIDs:", error);
    throw error; // Rethrow the error to handle it at a higher level
  }
}

export async function getProjectById(prisma: PrismaClient, uuid: string): Promise<(PrismaProject & { members: PrismaProjectMember[]; tickets: { uuid: string }[] }) | null> {
  return await prisma.project.findUnique({
    where: { uuid },
    include: {
      members: true, // Include project members
      tickets: true, // Include tickets
    },
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

function prismaToProjectMember(prismaMember: PrismaProjectMember): ProjectMember {
  return {
    projectId: prismaMember.project_uuid,
    pubKey: prismaMember.pubkey,
    role: prismaMember.role,
    createdAt: Number(prismaMember.created_at), // Convert bigint to number
  };
}

// Main function to map Prisma Project to general Project
export function prismaToProject(prismaProject: PrismaProject & { members: PrismaProjectMember[]; tickets: { uuid: string }[] }): Project {
  return {
    uuid: prismaProject.uuid,
    name: prismaProject.name,
    description: prismaProject.description,
    isPrivate: prismaProject.is_private, // Map Prisma's snake_case to camelCase
    createdAt: Number(prismaProject.created_at), // Convert bigint to number
    lastEventId: prismaProject.last_event_id,
    lastEventCreatedAt: Number(prismaProject.last_event_created_at), // Convert bigint to number
    members: prismaProject.members.map(prismaToProjectMember), // Map members
    tickets: prismaProject.tickets.map((ticket) => ticket.uuid), // Extract ticket UUIDs
  };
}
