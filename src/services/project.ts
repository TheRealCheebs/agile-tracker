import { v4 as uuidv4 } from 'uuid';
import type { Project } from '../interfaces/project.js';

export function createProject(
  name: string,
  creatorPubkey: string,
  description: string,
  isPrivate: boolean = false,
  members: { pubkey: string; role?: string }[] = []
): Project {
  // Always add the creator as admin
  const allMembers = [
    { pubkey: creatorPubkey, role: 'admin' },
    ...members.filter(m => m.pubkey !== creatorPubkey)
  ];

  const projectId = uuidv4();
  const createdTime = Number(Date.now());

  const projectMembers = allMembers.map((member) => ({
    projectId: projectId,
    pubKey: member.pubkey,
    role: member.role === null || member.role === undefined ? "member" : member.role,
    createdAt: createdTime,
  }));

  return {
    uuid: projectId,
    name,
    description,
    isPrivate,
    createdAt: createdTime,
    lastEventId: null,
    lastEventCreatedAt: createdTime,
    members: projectMembers,
  } as Project; // Ensure the returned object matches the Project type
}
