import type { Request } from 'express';

export interface AdminIdentity {
  id: string;
  email: string;
  fullName: string;
  role: 'admin';
}

export type AdminRequest = Request & { admin: AdminIdentity };
