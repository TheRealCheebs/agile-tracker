export interface Project {
  uuid: string;
  name: string;
  description: string;
  isPrivate: boolean;
  createdAt: number;
  lastEventId?: string | null;
  lastEventCreatedAt?: number | null;
  members: ProjectMember[];
  tickets: string[];
}

export interface ProjectMember {
  projectId: string;
  pubKey: string;
  role: string;
  createdAt: number;
}
