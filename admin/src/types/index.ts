// ============================================================================
// Types for LTVN Admin Portal (Strictly matching Backend Drizzle Schema)
// ============================================================================

export type UserRole = 'admin' | 'editor';
export type UserStatus = 'active' | 'inactive';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAsset {
  id: string;
  fileName: string;
  storageKey: string;
  publicUrl: string;
  altText?: string | null;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  uploadedBy?: string | null;
  createdAt: string;
}

export type MachineStatus = 'draft' | 'published' | 'archived';

export interface MachineImage {
  id: string;
  machineId: string;
  imageId: string;
  caption?: string | null;
  sortOrder: number;
  image?: MediaAsset;
}

export interface MachineApplication {
  id: string;
  machineId: string;
  title: string;
  description?: string | null;
  sortOrder: number;
}

export interface MachineHighlight {
  id: string;
  machineId: string;
  title: string;
  description?: string | null;
  icon?: string | null;
  sortOrder: number;
}

export interface MachineSpec {
  id: string;
  machineId: string;
  groupName: string;
  specName: string;
  specValue: string; // TEXT as per final spec
  unit?: string | null;
  sortOrder: number;
}

export interface Standard {
  id: string;
  code: string;
  organization: string;
  year?: number | null;
  title?: string | null;
  description?: string | null;
  createdAt: string;
}

export interface MachineStandard {
  machineId: string;
  standardId: string;
  note?: string | null;
  sortOrder: number;
  standard?: Standard;
}

export interface Machine {
  id: string;
  name: string;
  slug: string;
  model?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  mainImageId?: string | null;
  status: MachineStatus;
  sortOrder: number;
  publishedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  // Sub-relations
  mainImage?: MediaAsset;
  images?: MachineImage[];
  applications?: MachineApplication[];
  highlights?: MachineHighlight[];
  specs?: MachineSpec[];
  standards?: MachineStandard[];
}

export type NewsEventType = 'news' | 'event';
export type NewsEventStatus = 'draft' | 'published' | 'archived';

export interface ContentBlock {
  type:
    | 'heading'
    | 'paragraph'
    | 'image'
    | 'bullet_list'
    | 'numbered_list'
    | 'table'
    | 'quote'
    | 'video'
    | 'button';
  data: Record<string, unknown>;
}

export interface ContentJsonb {
  version: number;
  blocks: ContentBlock[];
}

export interface NewsEvent {
  id: string;
  type: NewsEventType;
  title: string;
  slug: string;
  shortDescription?: string | null;
  thumbnailImageId?: string | null;
  thumbnailImage?: MediaAsset;
  content: ContentJsonb;
  status: NewsEventStatus;
  publishedAt?: string | null;
  eventStartAt?: string | null;
  eventEndAt?: string | null;
  location?: string | null;
  authorId?: string | null;
  author?: User;
  createdAt: string;
  updatedAt: string;
}

export type ContactStatus = 'new' | 'processing' | 'resolved' | 'spam';

export interface Contact {
  id: string;
  fullName: string;
  companyName?: string | null;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  status: ContactStatus;
  assignedTo?: string | null;
  assignedUser?: User;
  adminNote?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AdminView =
  | 'dashboard'
  | 'machines'
  | 'standards'
  | 'media'
  | 'news-events'
  | 'contacts'
  | 'users'
  | 'settings';
