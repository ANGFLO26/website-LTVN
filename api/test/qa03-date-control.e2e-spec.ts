import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/database/schema.js';

// Positive control: ensure the SQL compiler used by the mutation regression tests
// still detects the original mistake. This bypasses the fixed contracts on purpose.
const compiler = drizzle.mock({ schema });
const rawClientDate = '2020-01-02T03:04:05.000Z';
const resources = [
  { name: 'Machines', table: schema.machines, update: true },
  { name: 'News', table: schema.newsEvents, update: true },
  { name: 'Users', table: schema.users, update: true },
  { name: 'Media', table: schema.mediaAssets, update: false },
  { name: 'Standards', table: schema.standards, update: true },
];

describe('QA-03 original Date error: isolated compiler positive control', () => {
  it.each(resources)('$name: raw client Date string reproduces the original create error', ({ table }) => {
    const unsafeData: Record<string, unknown> = { createdAt: rawClientDate };
    expect(() => compiler.insert(table).values(unsafeData).toSQL()).toThrow('value.toISOString is not a function');
  });

  it.each(resources.filter((resource) => resource.update))
    ('$name: raw client Date string reproduces the original update error', ({ table }) => {
      const unsafeData: Record<string, unknown> = { createdAt: rawClientDate };
      expect(() => compiler.update(table).set(unsafeData).where(eq(table.id, '11111111-1111-4111-8111-111111111111'))
        .toSQL()).toThrow('value.toISOString is not a function');
    });
});
