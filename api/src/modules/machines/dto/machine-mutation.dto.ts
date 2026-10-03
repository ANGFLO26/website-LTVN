// Writable Machine fields only. IDs, timestamps and read relations are not input.
export interface CreateMachineDto {
  name: string;
  slug?: string;
  model?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  mainImageId?: string | null;
  status?: 'draft' | 'published' | 'archived';
  sortOrder?: number;
  applications?: Array<{
    title: string;
    description?: string | null;
    sortOrder?: number;
  }>;
  highlights?: Array<{
    title: string;
    description?: string | null;
    icon?: string | null;
    sortOrder?: number;
  }>;
  specs?: Array<{
    groupName: string;
    specName: string;
    specValue: string;
    unit?: string | null;
    sortOrder?: number;
  }>;
  standards?: Array<{
    standardId: string;
    note?: string | null;
    sortOrder?: number;
  }>;
}

export type UpdateMachineDto = Partial<CreateMachineDto>;
