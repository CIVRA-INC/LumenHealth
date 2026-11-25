import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { nameKey } from '../src/modules/patients/patient.mapper';
import {
  createApp,
  createWorld,
  ownerClient,
  randomLetters,
  signIn,
  type Agent,
  type World,
} from './helpers';

const owner = ownerClient();
let app: NestExpressApplication;
let big: World;
let empty: World;
let other: World;
let desk: Agent;
let emptyDesk: Agent;
let admin: Agent;
let otherAdmin: Agent;
const TOTAL = 123;

/** Bulk-creates synthetic patients straight in the database (the API path is tested elsewhere). */
async function seedPatients(world: World, count: number) {
  const base = Date.parse('2026-01-01T00:00:00Z');
  await owner.patient.createMany({
    data: Array.from({ length: count }, (_, i) => {
      // Family names repeat in groups of 3 so sorting needs the tie-break to stay deterministic.
      const familyName = `Fam${String.fromCharCode(65 + ((Math.floor(i / 3) / 26 / 26) % 26))}${String.fromCharCode((65 + ((Math.floor(i / 3) / 26) % 26)) | 0)}${String.fromCharCode(65 + (Math.floor(i / 3) % 26))}`;
      const givenName = `Given${String(i).padStart(3, '0')}`;
      return {
        organizationId: world.orgId,
        mrn: `PG-${String(i + 1).padStart(6, '0')}`,
        givenName,
        familyName,
        dateOfBirth: new Date(Date.UTC(1950 + (i % 60), i % 12, 1 + (i % 27))),
        sex: i % 2 ? ('MALE' as const) : ('FEMALE' as const),
        phone: `+23480${String(10_000_000 + i)}`,
        nameKey: nameKey(givenName, familyName),
        registeredBranchId: world.branchId,
        createdById: world.users.frontDesk.id,
        updatedById: world.users.frontDesk.id,
        createdAt: new Date(base + i * 60_000),
      };
    }),
  });
}

beforeAll(async () => {
  app = await createApp();
  big = await createWorld(owner, 'page-big');
  empty = await createWorld(owner, 'page-empty');
  other = await createWorld(owner, 'page-other');
  await seedPatients(big, TOTAL);
  await seedPatients(other, 5);
  desk = await signIn(app, big.users.frontDesk.email);
  emptyDesk = await signIn(app, empty.users.frontDesk.email);
  admin = await signIn(app, big.users.admin.email);
  otherAdmin = await signIn(app, other.users.admin.email);
});
afterAll(async () => {
  await app.close();
  await owner.$disconnect();
});

interface ListBody {
  items: { id: string; mrn: string; familyName: string; givenName: string; dateOfBirth: string }[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
const list = async (agent: Agent, query: Record<string, string | number | undefined>) =>
  agent.get('/api/v1/patients').query(query);

describe('patient registry pagination', () => {
  it('returns correct page metadata', async () => {
    const res = await list(desk, { page: 2, pageSize: 25 });
    const body = res.body as ListBody;
    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      total: TOTAL,
      page: 2,
      pageSize: 25,
      totalPages: 5,
      hasNextPage: true,
      hasPreviousPage: true,
    });
    expect(body.items).toHaveLength(25);
  });

  it('serves a short last page and flags that there is no next page', async () => {
    const body = (await list(desk, { page: 5, pageSize: 25 })).body as ListBody;
    expect(body.items).toHaveLength(TOTAL - 100);
    expect(body).toMatchObject({ hasNextPage: false, hasPreviousPage: true, totalPages: 5 });
  });

  it('returns no rows, with accurate metadata, for a page beyond the last', async () => {
    const body = (await list(desk, { page: 99, pageSize: 25 })).body as ListBody;
    expect(body.items).toEqual([]);
    expect(body).toMatchObject({
      total: TOTAL,
      page: 99,
      totalPages: 5,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it('covers every record exactly once across pages, in each supported sort order', async () => {
    for (const [sort, order] of [
      ['name', 'asc'],
      ['name', 'desc'],
      ['mrn', 'asc'],
      ['dateOfBirth', 'desc'],
      ['registered', 'asc'],
      ['registered', 'desc'],
    ] as const) {
      const seen: string[] = [];
      for (let page = 1; page <= 5; page += 1) {
        const body = (await list(desk, { page, pageSize: 25, sort, order })).body as ListBody;
        seen.push(...body.items.map((i) => i.id));
      }
      expect(seen, `${sort} ${order}`).toHaveLength(TOTAL);
      expect(new Set(seen).size, `${sort} ${order} unique`).toBe(TOTAL);
    }
  });

  it('sorts correctly and deterministically, including ties', async () => {
    const byName = (
      (await list(desk, { pageSize: 100, sort: 'name', order: 'asc' })).body as ListBody
    ).items;
    const keys = byName.map((p) => `${p.familyName}|${p.givenName}`);
    expect(keys).toEqual([...keys].sort());
    // Repeating the request gives the same order.
    const again = (
      (await list(desk, { pageSize: 100, sort: 'name', order: 'asc' })).body as ListBody
    ).items;
    expect(again.map((p) => p.id)).toEqual(byName.map((p) => p.id));

    const byMrnDesc = (
      (await list(desk, { pageSize: 10, sort: 'mrn', order: 'desc' })).body as ListBody
    ).items;
    expect(byMrnDesc[0]!.mrn).toBe(`PG-${String(TOTAL).padStart(6, '0')}`);
    const byDob = (
      (await list(desk, { pageSize: 100, sort: 'dateOfBirth', order: 'asc' })).body as ListBody
    ).items.map((p) => p.dateOfBirth);
    expect(byDob).toEqual([...byDob].sort());
  });

  it('applies search before paging and counts only the matches', async () => {
    const res = await list(desk, { q: 'Given01', pageSize: 5, page: 2 });
    const body = res.body as ListBody;
    // Given010..Given019 = 10 matches (Given01x).
    expect(body.total).toBe(10);
    expect(body.totalPages).toBe(2);
    expect(body.items).toHaveLength(5);
    expect(body.items.every((p) => p.givenName.startsWith('Given01'))).toBe(true);
    const none = (await list(desk, { q: 'nomatchhere' })).body as ListBody;
    expect(none).toMatchObject({
      total: 0,
      items: [],
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('handles an organisation with no patients', async () => {
    const body = (await list(emptyDesk, {})).body as ListBody;
    expect(body).toMatchObject({
      total: 0,
      items: [],
      page: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('rejects invalid pagination and sort input', async () => {
    for (const query of [
      { page: 0 },
      { page: -1 },
      { page: 'abc' },
      { pageSize: 0 },
      { pageSize: 101 },
      { pageSize: 'many' },
      { sort: 'passwordHash' },
      { sort: 'name; drop table patients' },
      { order: 'sideways' },
    ]) {
      const res = await list(desk, query);
      expect(res.status, JSON.stringify(query)).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    }
  });

  it('never returns another organisation’s patients, however the list is paged', async () => {
    const body = (await list(desk, { pageSize: 100, page: 1 })).body as ListBody;
    expect(body.items.every((p) => p.mrn.startsWith('PG-'))).toBe(true);
    const otherBody = (
      await list(await signIn(app, other.users.frontDesk.email), { pageSize: 100 })
    ).body as ListBody;
    expect(otherBody.total).toBe(5);
  });

  it('stays consistent when records are added between page requests', async () => {
    const first = (await list(desk, { page: 1, pageSize: 25, sort: 'registered', order: 'asc' }))
      .body as ListBody;
    await owner.patient.create({
      data: {
        organizationId: big.orgId,
        mrn: `PG-LATE-${randomLetters(4)}`,
        givenName: 'Late',
        familyName: 'Arrival',
        dateOfBirth: new Date('1990-01-01'),
        sex: 'MALE',
        phone: '+2348099999999',
        nameKey: nameKey('Late', 'Arrival'),
        registeredBranchId: big.branchId,
        createdById: big.users.frontDesk.id,
        updatedById: big.users.frontDesk.id,
      },
    });
    const second = (await list(desk, { page: 2, pageSize: 25, sort: 'registered', order: 'asc' }))
      .body as ListBody;
    // The new record sorts last, so earlier pages are unchanged and the totals reflect it.
    expect(second.total).toBe(first.total + 1);
    expect(second.items.map((p) => p.id)).not.toContain(first.items[0]!.id);
    expect(second.items).toHaveLength(25);
  });
});

describe('staff list pagination', () => {
  it('searches, filters, sorts and paginates on the server, scoped to the organisation', async () => {
    const res = await admin
      .get('/api/v1/admin/users')
      .query({ pageSize: 2, page: 1, sort: 'name' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 5, pageSize: 2, totalPages: 3, hasNextPage: true });
    expect(res.body.items).toHaveLength(2);

    const clinicians = await admin.get('/api/v1/admin/users').query({ role: 'CLINICIAN' });
    expect(clinicians.body.total).toBe(2);
    expect(clinicians.body.items.every((u: { role: string }) => u.role === 'CLINICIAN')).toBe(true);

    const found = await admin
      .get('/api/v1/admin/users')
      .query({ q: big.users.nurse.email.split('@')[0] });
    expect(found.body.total).toBe(1);

    const byRole = await admin
      .get('/api/v1/admin/users')
      .query({ sort: 'role', order: 'desc', pageSize: 100 });
    const roles: string[] = byRole.body.items.map((u: { role: string }) => u.role);
    // Roles sort in their declared order (administrator, clinician, nurse, front desk), reversed here.
    const order = ['ORG_ADMIN', 'CLINICIAN', 'NURSE', 'FRONT_DESK'];
    const ranks = roles.map((r) => order.indexOf(r));
    expect(ranks).toEqual([...ranks].sort((a, b) => b - a));

    expect((await admin.get('/api/v1/admin/users').query({ sort: 'password' })).status).toBe(400);
    expect((await admin.get('/api/v1/admin/users').query({ pageSize: 500 })).status).toBe(400);

    const foreign = await otherAdmin.get('/api/v1/admin/users').query({ pageSize: 100 });
    const emails: string[] = foreign.body.items.map((u: { email: string }) => u.email);
    expect(emails).not.toContain(big.users.clinician.email);
  });
});

describe('audit list pagination', () => {
  it('filters by outcome, orders by time and paginates', async () => {
    await desk.get('/api/v1/encounters'); // denied for front desk: recorded as DENIED
    const denied = await admin.get('/api/v1/audit-events').query({ outcome: 'DENIED' });
    expect(denied.status).toBe(200);
    expect(denied.body.total).toBeGreaterThan(0);
    expect(denied.body.items.every((e: { outcome: string }) => e.outcome === 'DENIED')).toBe(true);

    const asc = (
      await admin.get('/api/v1/audit-events').query({ order: 'asc', pageSize: 50 })
    ).body.items.map((e: { occurredAt: string }) => e.occurredAt);
    expect(asc).toEqual([...asc].sort());
    const page = await admin.get('/api/v1/audit-events').query({ pageSize: 5, page: 2 });
    expect(page.body).toMatchObject({ page: 2, pageSize: 5 });
    expect(page.body.totalPages).toBe(Math.max(1, Math.ceil(page.body.total / 5)));
    expect((await admin.get('/api/v1/audit-events').query({ outcome: 'MAYBE' })).status).toBe(400);
  });
});

describe('consultations list', () => {
  it('orders by start time in the requested direction', async () => {
    const res = await admin.get('/api/v1/encounters').query({ order: 'asc' });
    expect(res.status).toBe(403); // admins have no clinical access
    const clinician = await signIn(app, big.users.clinician.email);
    const ok = await clinician.get('/api/v1/encounters').query({ order: 'asc', pageSize: 10 });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ page: 1, totalPages: 1, hasNextPage: false });
    expect((await clinician.get('/api/v1/encounters').query({ sort: 'patientName' })).status).toBe(
      400,
    );
  });
});
