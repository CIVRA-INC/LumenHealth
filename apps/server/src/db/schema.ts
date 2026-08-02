import {
  pgTable,
  uuid,
  timestamp,
  text,
  boolean,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Base columns for all tables
const defaultColumns = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
};

export const orgs = pgTable('orgs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ...defaultColumns,
});

export const facilities = pgTable(
  'facilities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .references(() => orgs.id)
      .notNull(),
    name: text('name').notNull(),
    ...defaultColumns,
  },
  (t) => [
    // RLS: Users can only see facilities in their org
    pgPolicy('facility_isolation', {
      for: 'all',
      to: 'authenticated',
      using: sql`org_id = current_setting('app.org_id')::uuid`,
    }),
  ],
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .references(() => orgs.id)
      .notNull(),
    email: text('email').unique().notNull(),
    passwordHash: text('password_hash').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    ...defaultColumns,
  },
  (t) => [
    // RLS: Users can only see other users in their org
    pgPolicy('user_isolation', {
      for: 'all',
      to: 'authenticated',
      using: sql`org_id = current_setting('app.org_id')::uuid`,
    }),
  ],
);

// M1: Identity & Tenancy
export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  deviceId: text('device_id').unique().notNull(), // hardware ID or token
  name: text('name'),
  lastActiveAt: timestamp('last_active_at'),
  isRevoked: boolean('is_revoked').default(false).notNull(),
  ...defaultColumns,
});

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').unique().notNull(), // e.g. clinician, nurse, org_admin
  permissions: text('permissions').array().notNull(), // e.g. ["patients:read", "encounters:write"]
  ...defaultColumns,
});

export const roleAssignments = pgTable('role_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  roleId: uuid('role_id')
    .references(() => roles.id)
    .notNull(),
  facilityId: uuid('facility_id').references(() => facilities.id), // Null means org-wide
  ...defaultColumns,
});

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .references(() => orgs.id)
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    action: text('action').notNull(), // e.g. "read", "write", "delete"
    resourceType: text('resource_type').notNull(), // e.g. "patients", "encounters"
    resourceId: uuid('resource_id').notNull(),
    details: text('details'), // JSON stringified payload or diff
    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
  (t) => [
    // RLS: Audit logs are org-isolated
    pgPolicy('audit_isolation', {
      for: 'all',
      to: 'authenticated',
      using: sql`org_id = current_setting('app.org_id')::uuid`,
    }),
  ],
);
