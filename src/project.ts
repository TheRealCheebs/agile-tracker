import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import type { Project as PrismaProject } from '@prisma/client';

export interface Project {
  id: number;
  uuid: string;
  name: string;
  description?: string;
  is_private: boolean;
  created_at: number;
  last_event_id?: string | null;
  last_event_created_at?: number | null;
  members?: ProjectMember[];
  tickets?: any[];
}

export interface ProjectMember {
  project_id: number;
  pubkey: string;
  role: string;
  created_at: number;
}


// Create a new project and add the creator as admin (plus any additional members)
export async function createProject(
  prisma: PrismaClient,
  name: string,
  creator_pubkey: string,
  description: string,
  is_private: boolean = false,
  members: { pubkey: string; role?: string }[] = []
): Promise<PrismaProject> {
  // Always add the creator as admin
  const allMembers = [
    { pubkey: creator_pubkey, role: 'admin' },
    ...members.filter(m => m.pubkey !== creator_pubkey)
  ];
  return await prisma.project.create({
    data: {
      uuid: uuidv4(),
      name,
      description: description,
      is_private: is_private,
      created_at: Number(Date.now()),
      last_event_id: null,
      last_event_created_at: Number(Date.now()),
      members: {
        create: allMembers.map(m => ({
          pubkey: m.pubkey,
          role: m.role ?? 'member',
          created_at: Number(Date.now())
        }))
      }
    }
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

export async function updateProject(prisma: PrismaClient, uuid: string, updates: Partial<{ name: string; description: string }>): Promise<PrismaProject> {
  return await prisma.project.update({
    where: { uuid },
    data: updates
  });
}

