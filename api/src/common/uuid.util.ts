export function isValidUuid(id?: string | null): boolean {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function sanitizeUuid<T extends { id?: string | null }>(data: T): T {
  if (data.id && !isValidUuid(data.id)) {
    const { id: _, ...rest } = data;
    return rest as T;
  }
  return data;
}
