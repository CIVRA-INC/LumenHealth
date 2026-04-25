# Backend Module Template for Express Services

> Version: 1.0.0 — CHORD-013
> Owner: Backend Platform
> Review trigger: new domain module, cross-module dependency, or shared contract change

---

## Purpose

This document defines the standard layout, naming conventions, and implementation boundaries for every domain module inside `apps/api/src/modules/`. Following this template keeps the codebase consistent, testable, and safe to extend in parallel across teams.

---

## Module Directory Layout

```
apps/api/src/modules/<domain>/
├── <domain>.router.ts        # Express Router — mounts controller handlers
├── <domain>.controller.ts    # HTTP layer — parse, validate, delegate, respond
├── <domain>.service.ts       # Business logic — orchestrates repository calls
├── <domain>.repository.ts    # Data access — Mongoose queries only
├── <domain>.schema.ts        # Mongoose schema and model definition
├── <domain>.types.ts         # Domain-local TypeScript interfaces and Zod schemas
└── __tests__/
    ├── <domain>.service.test.ts
    └── <domain>.controller.test.ts
```

Shared cross-app types belong in `packages/types`. Domain-local types that are not consumed outside the module stay in `<domain>.types.ts`.

---

## Layer Responsibilities

### Router (`<domain>.router.ts`)

- Creates an `express.Router()` instance.
- Applies route-level middleware (auth guard, subscription gate, audit hook).
- Delegates every handler to the controller — no business logic here.
- Exported and mounted in `apps/api/src/app.ts` under `/api/v1/<domain>`.

```ts
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import * as controller from './<domain>.controller';

const router = Router();

router.get('/', requireAuth, controller.list);
router.post('/', requireAuth, controller.create);
router.get('/:id', requireAuth, controller.getById);

export default router;
```

### Controller (`<domain>.controller.ts`)

- Thin HTTP adapter — no business logic.
- Validates the request body/params/query with `validateRequest(schema, req)`.
- Reads actor and clinic context from `req.context` (set by auth middleware).
- Calls the service and returns the result.
- Throws `ApiProblem` for expected failures; unhandled errors bubble to the global error handler.

```ts
import { Request, Response, NextFunction } from 'express';
import { validateRequest } from '../../lib/validate';
import { ApiProblem } from '../../lib/api-problem';
import * as service from './<domain>.service';
import { CreateDomainSchema } from './<domain>.types';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = validateRequest(CreateDomainSchema, req.body);
    const result = await service.create(req.context.clinicId, body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}
```

### Service (`<domain>.service.ts`)

- Contains all business logic and orchestration.
- Calls one or more repositories; never touches Mongoose models directly.
- Emits audit events for mutating operations via `auditLog(...)`.
- Returns plain objects or typed DTOs — not Mongoose documents.

```ts
import * as repo from './<domain>.repository';
import { auditLog } from '../../lib/audit';

export async function create(clinicId: string, data: CreateDomainInput) {
  const record = await repo.insert({ ...data, clinicId });
  await auditLog({ action: 'domain.create', clinicId, resourceId: record.id });
  return record;
}
```

### Repository (`<domain>.repository.ts`)

- Only Mongoose queries — no business logic, no HTTP concerns.
- Always scopes queries to `clinicId` for multi-tenant safety.
- Returns plain objects (`.lean()`) unless the caller explicitly needs a Mongoose document.

```ts
import { DomainModel } from './<domain>.schema';

export async function insert(data: Partial<DomainDocument>) {
  const doc = await DomainModel.create(data);
  return doc.toObject();
}

export async function findByClinic(clinicId: string) {
  return DomainModel.find({ clinicId }).lean();
}
```

### Schema (`<domain>.schema.ts`)

- Defines the Mongoose schema and exports the compiled model.
- Includes `clinicId` on every patient/clinical document.
- Uses `timestamps: true` for `createdAt` / `updatedAt`.
- Adds indexes for common query patterns.

```ts
import { Schema, model, Document } from 'mongoose';

export interface DomainDocument extends Document {
  clinicId: string;
  // ... domain fields
  createdAt: Date;
  updatedAt: Date;
}

const domainSchema = new Schema<DomainDocument>(
  {
    clinicId: { type: String, required: true, index: true },
    // ... domain fields
  },
  { timestamps: true }
);

export const DomainModel = model<DomainDocument>('Domain', domainSchema);
```

### Types (`<domain>.types.ts`)

- Zod schemas for request validation.
- TypeScript interfaces inferred from Zod or defined manually.
- No runtime logic — pure type and schema definitions.

```ts
import { z } from 'zod';

export const CreateDomainSchema = z.object({
  name: z.string().min(1),
  // ...
});

export type CreateDomainInput = z.infer<typeof CreateDomainSchema>;
```

---

## Tests

- Unit tests for the service layer mock the repository.
- Integration tests for the controller use `supertest` against a `createApp()` instance with an in-memory MongoDB.
- Every test file must cover the primary success path and at least one failure mode (missing field, unauthorized, not found).
- Test fixtures must be synthetic — no real patient names, IDs, or contact details.

---

## Observability

- Mutating operations (create, update, delete) must emit an audit log entry.
- Errors thrown as `ApiProblem` are logged at `warn` level by the global error handler.
- Unexpected errors are logged at `error` level with a correlation ID from `req.context`.

---

## Workspace Boundaries

- Modules inside `apps/api` may import from `@lumen/config` and `@lumen/types`.
- Modules must not import from `apps/web` or `apps/stellar-service`.
- Cross-module imports within `apps/api` are allowed only through the service layer — never directly between repositories or schemas.

Run `npm run check:boundaries` before merging any module that introduces a new cross-workspace import.

---

## Checklist for New Modules

- [ ] Directory follows the layout above
- [ ] Router mounted in `apps/api/src/app.ts`
- [ ] Controller validates all inputs with Zod
- [ ] Service emits audit logs for mutations
- [ ] Repository scopes all queries to `clinicId`
- [ ] Unit tests cover service success and failure paths
- [ ] Controller integration test covers at least one route
- [ ] No real PHI in test fixtures
- [ ] `npm run check:boundaries` passes
