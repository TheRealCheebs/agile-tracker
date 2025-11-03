export interface Ticket {
  uuid: string;
  projectUuid: string;
  title: string;
  type: string;
  description: string;
  state: string;
  parentUuid: string;
  creatorPubkey: string;
  createdAt: number;
  updatedAt: number;
  lastEventId: string;
  lastEventCreatedAt: number;
  childrenUuids: string[];
}
