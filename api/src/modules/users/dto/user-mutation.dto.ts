// Preserve the legacy form's role/status options; this is not an auth/RBAC change.
export interface CreateUserDto {
  email: string;
  fullName: string;
  role: 'admin' | 'editor';
  status?: 'active' | 'inactive';
}

export type UpdateUserDto = Partial<CreateUserDto>;
