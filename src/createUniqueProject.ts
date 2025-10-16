import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import type { Project as PrismaProject } from '@prisma/client';

export async function createUniqueProject(
  prisma: PrismaClient,
  name: string,
  description?: string,
  is_private: boolean = false
): Promise<PrismaProject> {
  let uuid: string;
  let exists = true;
  // Try until we get a truly unique uuid (extremely unlikely to loop more than once)
  do {
    uuid = uuidv4();
    const found = await prisma.project.findUnique({ where: { uuid } });
    exists = !!found;
  } while (exists);

  return await prisma.project.create({
    data: {
      uuid,
      name,
      description: description ?? null,
      is_private,
      created_at: Date.now(),
      last_event_id: null,
      last_event_created_at: null
    }
  });
}
