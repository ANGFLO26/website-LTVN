/* oxlint-disable unicorn/no-thenable */
import { describe, expect, it } from 'vitest';
import { RedirectsService } from './redirects.service.js';
import { BadRequestException } from '@nestjs/common';

type Row = { id: string; sourcePath: string; destinationPath: string; isActive: boolean };

/** Two independent fake connections with a transaction-scoped lock. This is a
 * unit contract test; a real PostgreSQL overlap test is still required. */
function createTransactionalDb() {
  const rows: Row[] = [];
  const events: string[] = [];
  let sessionsStarted = 0;
  let releasePrevious = Promise.resolve();
  let nextId = 1;
  const db = {
    async transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
      const session = ++sessionsStarted;
      events.push(`begin:${session}`);
      let release!: () => void;
      const held = new Promise<void>((resolve) => { release = resolve; });
      const waitForPrevious = releasePrevious;
      releasePrevious = held;
      const tx = {
        async execute() {
          await waitForPrevious;
          events.push(`lock:${session}`);
          // Let a second connection enter its transaction while this lock is held.
          if (session === 1) await new Promise((resolve) => setTimeout(resolve, 10));
        },
        select(selection: Record<string, unknown>) {
          return {
            from() {
              const data = Object.keys(selection).length === 1
                ? rows.map(({ id }) => ({ id }))
                : rows.map((row) => ({ ...row }));
              return {
                where() { return Promise.resolve([]); },
                then(resolve: (value: typeof data) => void) { return Promise.resolve(data).then(resolve); },
              };
            },
          };
        },
        insert() {
          return {
            values(value: Omit<Row, 'id'>) {
              return {
                returning() {
                  events.push(`insert:${session}`);
                  const created = { ...value, id: String(nextId++) };
                  rows.push(created);
                  return Promise.resolve([created]);
                },
              };
            },
          };
        },
      };
      try {
        return await callback(tx);
      } finally {
        events.push(`release:${session}`);
        release();
      }
    },
  };
  return { db, rows, events, getSessionsStarted: () => sessionsStarted };
}

describe('F09 redirect graph mutation serialization', () => {
  it('locks before reading fresh graph: opposing concurrent creates cannot form a cycle', async () => {
    const fixture = createTransactionalDb();
    const service = new RedirectsService(fixture.db as any);
    const outcomes = await Promise.allSettled([
      service.create({ sourcePath: '/a', destinationPath: '/b' }),
      service.create({ sourcePath: '/b', destinationPath: '/a' }),
    ]);

    expect(fixture.getSessionsStarted()).toBe(2);
    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const rejected = outcomes.find((result) => result.status === 'rejected');
    expect(rejected && rejected.status === 'rejected' ? rejected.reason : null).toBeInstanceOf(BadRequestException);
    expect(fixture.rows).toHaveLength(1);
    expect(fixture.events.indexOf('lock:2')).toBeGreaterThan(fixture.events.indexOf('release:1'));
    expect(fixture.events.indexOf('insert:1')).toBeGreaterThan(fixture.events.indexOf('lock:1'));
  });

  it.each(['update', 'toggle', 'remove'] as const)('%s takes the graph lock before reading and writing', async (mutation) => {
    const events: string[] = [];
    const current = {
      id: 'record-1', sourcePath: '/old', destinationPath: '/target',
      isActive: mutation !== 'toggle', notes: null,
    };
    const tx = {
      async execute() { events.push('lock'); },
      select() {
        return {
          from() {
            return {
              async where() { events.push('read'); return [current]; },
              then(resolve: (value: Row[]) => void) {
                events.push('graph');
                return Promise.resolve([] as Row[]).then(resolve);
              },
            };
          },
        };
      },
      update() {
        return {
          set(value: Partial<Row>) {
            return {
              where() {
                return {
                  async returning() { events.push('write'); return [{ ...current, ...value }]; },
                };
              },
            };
          },
        };
      },
      delete() {
        return { async where() { events.push('write'); } };
      },
    };
    const db = { async transaction<T>(callback: (transaction: typeof tx) => Promise<T>) { return callback(tx); } };
    const service = new RedirectsService(db as any);
    if (mutation === 'update') await service.update(current.id, { destinationPath: '/new-target' });
    if (mutation === 'toggle') await service.toggle(current.id);
    if (mutation === 'remove') await service.remove(current.id);
    expect(events[0]).toBe('lock');
    expect(events.indexOf('read')).toBeGreaterThan(events.indexOf('lock'));
    expect(events.indexOf('write')).toBeGreaterThan(events.indexOf('read'));
  });
});
