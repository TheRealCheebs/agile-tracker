export interface Identity {
  pubKey: string;
  name: string;
  createdAt: number;
  lastUsed: number;
  isActive: boolean;
}

export type UserKeys = {
  pubKey: string;
  privateKey: Uint8Array;
};

