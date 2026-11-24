import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaPg } from '@prisma/adapter-pg';
import request from 'supertest';
import { configureApp } from '../src/app.factory';
import { AppModule } from '../src/app.module';
import { loadConfig } from '../src/config/env';
import { PrismaClient, type Role } from '../src/generated/prisma/client';
import { PasswordService } from '../src/modules/identity/password.service';
import { nameKey } from '../src/modules/patients/patient.mapper';

export const TEST_PASSWORD = 'Correct-Horse-Battery-9';
let cachedHash: Promise<string> | undefined;
const passwordHash = () => (cachedHash ??= new PasswordService().hash(TEST_PASSWORD));

export async function createApp(): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bufferLogs: true });
  configureApp(app, loadConfig());
  await app.init();
  return app;
}

/** Schema-owner connection: bypasses row-level security. For fixtures and assertions only. */
export function ownerClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.TEST_MIGRATION_DATABASE_URL! }),
  });
}

/** Restricted application-role connection, exactly as the API uses it. */
export function appRoleClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
}

export interface World {
  orgId: string;
  slug: string;
  branchId: string;
  branch2Id: string;
  departmentId: string;
  users: Record<
    'admin' | 'clinician' | 'clinician2' | 'nurse' | 'frontDesk',
    { id: string; email: string; membershipId: string }
  >;
}

/** One isolated organisation with a user for every role. Unique names keep test files independent. */
export async function createWorld(owner: PrismaClient, label = 'org'): Promise<World> {
  const tag = randomUUID().slice(0, 8);
  const org = await owner.organization.create({
    data: { name: `Test ${label} ${tag}`, slug: `${label}-${tag}`, timezone: 'Africa/Lagos' },
  });
  const branch = await owner.branch.create({
    data: { organizationId: org.id, name: 'Main', code: 'MAIN' },
  });
  const branch2 = await owner.branch.create({
    data: { organizationId: org.id, name: 'Annex', code: 'ANX' },
  });
  const dept = await owner.department.create({
    data: { organizationId: org.id, branchId: branch.id, name: 'Outpatient' },
  });
  const hash = await passwordHash();

  const make = async (key: string, role: Role, branchIds: string[]) => {
    const email = `${key}.${tag}@lumen.test`;
    const user = await owner.user.create({
      data: { email, fullName: `${key} ${tag}`, passwordHash: hash },
    });
    const membership = await owner.membership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role,
        branches: { create: branchIds.map((branchId) => ({ branchId })) },
      },
    });
    return { id: user.id, email, membershipId: membership.id };
  };

  return {
    orgId: org.id,
    slug: org.slug,
    branchId: branch.id,
    branch2Id: branch2.id,
    departmentId: dept.id,
    users: {
      admin: await make('admin', 'ORG_ADMIN', [branch.id, branch2.id]),
      clinician: await make('clinician', 'CLINICIAN', [branch.id, branch2.id]),
      clinician2: await make('clinician2', 'CLINICIAN', [branch.id]),
      nurse: await make('nurse', 'NURSE', [branch.id]),
      frontDesk: await make('desk', 'FRONT_DESK', [branch.id, branch2.id]),
    },
  };
}

export type Agent = ReturnType<typeof request.agent>;

/** Signs in and returns an agent that carries the session cookie. */
export async function signIn(
  app: NestExpressApplication,
  email: string,
  password = TEST_PASSWORD,
): Promise<Agent> {
  const agent = request.agent(app.getHttpServer());
  const res = await agent.post('/api/v1/auth/login').send({ email, password });
  if (res.status !== 200)
    throw new Error(`Sign-in failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

/** Names are compared letters-only, so random test names must be letters too. */
export function randomLetters(length: number): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const word = Array.from({ length }, () => alphabet[Math.floor(Math.random() * 26)]).join('');
  return word[0]!.toUpperCase() + word.slice(1);
}

let phoneCounter = Math.floor(Math.random() * 1_000_000);
export function newPatientBody(overrides: Record<string, unknown> = {}) {
  phoneCounter += 1;
  return {
    givenName: 'Test',
    familyName: randomLetters(10),
    dateOfBirth: '1990-05-17',
    sex: 'FEMALE',
    phone: `0803${String(phoneCounter % 10_000_000).padStart(7, '0')}`,
    ...overrides,
  };
}

export async function registerPatient(agent: Agent, overrides: Record<string, unknown> = {}) {
  const res = await agent.post('/api/v1/patients').send(newPatientBody(overrides));
  if (res.status !== 201)
    throw new Error(`Registration failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as {
    id: string;
    mrn: string;
    version: number;
    givenName: string;
    familyName: string;
  };
}

/** Creates a patient directly (bypassing the API) for fixtures that are not the subject of the test. */
export async function fixturePatient(owner: PrismaClient, world: World, givenName = 'Fixture') {
  const familyName = randomLetters(10);
  return owner.patient.create({
    data: {
      organizationId: world.orgId,
      mrn: `T-${randomUUID().slice(0, 8)}`,
      givenName,
      familyName,
      dateOfBirth: new Date('1985-01-01T00:00:00Z'),
      sex: 'MALE',
      phone: `+23480${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`,
      nameKey: nameKey(givenName, familyName),
      registeredBranchId: world.branchId,
      createdById: world.users.frontDesk.id,
      updatedById: world.users.frontDesk.id,
    },
  });
}
