# Express → NestJS migration tracker

Repository checklist for [tracking issue #1143](https://github.com/CIVRA-INC/LumenHealth/issues/1143).
Target: **NestJS 11.x**.

## Scope and repository baseline

This document tracks the migration only. Implementation, route inventory, architecture decisions,
tooling, and deployment changes belong to the linked issues.

The current [API package](../apps/api/package.json) uses Express `^5.2.1`,
TypeScript `^5.9.3`, and `"type": "module"`; it does not declare an `engines` field.
[CI](../.github/workflows/ci.yml) runs Node.js 20 and the [README](../README.md)
requires Node.js 20+. Preserve these constraints when introducing NestJS 11.x; resolve
ESM/build configuration in [#1157](https://github.com/CIVRA-INC/LumenHealth/issues/1157).

[app.ts](../apps/api/src/app.ts) currently mounts auth, staff/invitations, staff, clinics,
and audit under `/api/v1`, with a separate `/health` endpoint.
[server.ts](../apps/api/src/server.ts) listens using `serverConfig.apiPort`.
The published backlog describes additional surfaces (including internal audit and Stellar
anchoring files) that are absent from this checkout. Keep those issues tracked, but reconcile
their assumptions in the [inventory issue #1144](https://github.com/CIVRA-INC/LumenHealth/issues/1144)
before porting them. An issue title is not evidence that its feature already exists.

## Strangler-fig cutover strategy

Boot the new NestJS app alongside Express, with independently addressable services.
Keep Express serving existing traffic while a feature flag or reverse-proxy path split
routes selected modules to NestJS. Move one module at a time, preserving public URLs,
response contracts, authentication, and clinic isolation.

1. Establish the route inventory and module boundaries, then run both applications and their
   CI checks during the overlap period.
2. Before routing a module to NestJS, require its tests, clinic-isolation checks, and
   Express/Nest contract-parity comparison to pass. Capture latency/error-rate baselines;
   investigate load-test regressions over 10% before cutover.
3. Cut over Clinic first, then Staff & Invitations, Auth, and Audit, as tracked in Epic 11.
   Clinic requires a one-week soak without elevated errors or rollback. Verify token/session
   compatibility across both services before Auth cutover, including the deployed resolution
   of the in-memory-store risk in [#1178](https://github.com/CIVRA-INC/LumenHealth/issues/1178).
   Audit requires live Stellar integration verification. Validate web/mobile compatibility
   for each module.
4. Retain the ability to direct that module's traffic back to Express by reverting the
   feature flag or proxy split. The deploy-owner-reviewed plan in
   [#1148](https://github.com/CIVRA-INC/LumenHealth/issues/1148) must define concrete rollback
   thresholds, dashboards, state continuity, and soak criteria before traffic moves.
5. After all module cutovers complete and soak successfully, decommission the old Express
   application under [#1261](https://github.com/CIVRA-INC/LumenHealth/issues/1261), then finish
   the documentation and closure work in [#1267](https://github.com/CIVRA-INC/LumenHealth/issues/1267).

**Keep #1143 open until Epic 11 closes and every linked migration task is complete.**
Adding this tracker does not complete the migration or authorize a production cutover.

## Checklist conventions

Source: the published
[`nestjs-migration` backlog](https://github.com/CIVRA-INC/LumenHealth/issues?q=is%3Aissue%20label%3Anestjs-migration),
reviewed on 2026-09-30. All 125 issues (#1143–#1267), including the umbrella, are linked below.
Epic boundaries follow the headings embedded in the published issue bodies; Epic 0 covers
the six planning tasks before Epic 1.

The leading `[n]` in each title is the original backlog ordinal, not a GitHub issue number.
Likewise, short issue references inside those original titles/bodies refer to backlog ordinals:
for example, backlog #3 is GitHub #1145 and backlog #114 is GitHub #1256.
Use the explicit GitHub link on each checklist item.

Unchecked means completion has not been verified in this repository tracker; it is not a
live mirror of GitHub issue state. Check an item only after its acceptance criteria and
supporting implementation/review evidence are verified. Keep new migration issues linked
under their owning epic, and preserve the original grouping even where execution order differs
(for example, Epic 10's decommission task depends on Epic 11's cutovers).

## Epic 0 — Planning & Migration Foundations

- [ ] [#1143](https://github.com/CIVRA-INC/LumenHealth/issues/1143) — [1] [Epic] Express → NestJS migration tracking issue
- [ ] [#1144](https://github.com/CIVRA-INC/LumenHealth/issues/1144) — [2] Audit current Express app surface and produce a migration inventory
- [ ] [#1145](https://github.com/CIVRA-INC/LumenHealth/issues/1145) — [3] Decide and document module boundaries for the NestJS app
- [ ] [#1146](https://github.com/CIVRA-INC/LumenHealth/issues/1146) — [4] Choose validation library and standardize on it for the NestJS port
- [ ] [#1147](https://github.com/CIVRA-INC/LumenHealth/issues/1147) — [5] Stand up empty NestJS project skeleton alongside the Express app
- [ ] [#1148](https://github.com/CIVRA-INC/LumenHealth/issues/1148) — [6] Define the cutover/rollback plan and success metrics

## Epic 1 — Core Bootstrap, Config & Server Wiring

- [ ] [#1149](https://github.com/CIVRA-INC/LumenHealth/issues/1149) — [7] Port `server.ts` bootstrap to Nest's `main.ts`
- [ ] [#1150](https://github.com/CIVRA-INC/LumenHealth/issues/1150) — [8] Wrap `@lumen/config` as a Nest `ConfigModule`/custom provider
- [ ] [#1151](https://github.com/CIVRA-INC/LumenHealth/issues/1151) — [9] Recreate the `/health` endpoint as a Nest controller
- [ ] [#1152](https://github.com/CIVRA-INC/LumenHealth/issues/1152) — [10] Recreate global body-parser limits, including the audit export exception
- [ ] [#1153](https://github.com/CIVRA-INC/LumenHealth/issues/1153) — [11] Set global API prefix `/api/v1` and mount `/internal/audit` outside it
- [ ] [#1154](https://github.com/CIVRA-INC/LumenHealth/issues/1154) — [12] Configure global `ValidationPipe` defaults
- [ ] [#1155](https://github.com/CIVRA-INC/LumenHealth/issues/1155) — [13] Standardize CORS, security headers, and trust-proxy equivalents
- [ ] [#1156](https://github.com/CIVRA-INC/LumenHealth/issues/1156) — [14] Set up graceful shutdown hooks
- [ ] [#1157](https://github.com/CIVRA-INC/LumenHealth/issues/1157) — [15] Reconcile `type: "module"` / ESM output with Nest's build toolchain
- [ ] [#1158](https://github.com/CIVRA-INC/LumenHealth/issues/1158) — [16] Wire dev/build/start/lint/test scripts to match Turborepo conventions

## Epic 2 — Cross-Cutting Infrastructure: Guards, Interceptors, Filters, Pipes

- [ ] [#1159](https://github.com/CIVRA-INC/LumenHealth/issues/1159) — [17] Port `resolveAuthContext` middleware to an `AuthGuard`
- [ ] [#1160](https://github.com/CIVRA-INC/LumenHealth/issues/1160) — [18] Port `requireClinicScope` middleware to a `ClinicScopeGuard`
- [ ] [#1161](https://github.com/CIVRA-INC/LumenHealth/issues/1161) — [19] Port `requirePermission` middleware to a `PermissionsGuard`
- [ ] [#1162](https://github.com/CIVRA-INC/LumenHealth/issues/1162) — [20] Establish global guard ordering and composition strategy
- [ ] [#1163](https://github.com/CIVRA-INC/LumenHealth/issues/1163) — [21] Create `@AuthContext()` param decorator to replace `req.auth`
- [ ] [#1164](https://github.com/CIVRA-INC/LumenHealth/issues/1164) — [22] Build a global `HttpExceptionFilter` matching the response-helpers shape
- [ ] [#1165](https://github.com/CIVRA-INC/LumenHealth/issues/1165) — [23] Define custom exception classes per error family (auth, clinic, staff, audit)
- [ ] [#1166](https://github.com/CIVRA-INC/LumenHealth/issues/1166) — [24] Recreate account-lock (423) and rate-limit style responses
- [ ] [#1167](https://github.com/CIVRA-INC/LumenHealth/issues/1167) — [25] Port validators to Nest DTOs + pipes (password, clinic, invitation)
- [ ] [#1168](https://github.com/CIVRA-INC/LumenHealth/issues/1168) — [26] Build a `RequestIdMiddleware`/interceptor for request correlation
- [ ] [#1169](https://github.com/CIVRA-INC/LumenHealth/issues/1169) — [27] Port `authLogger` to a Nest-injectable structured logger
- [ ] [#1170](https://github.com/CIVRA-INC/LumenHealth/issues/1170) — [28] Build a logging interceptor for request/response timing
- [ ] [#1171](https://github.com/CIVRA-INC/LumenHealth/issues/1171) — [29] Recreate response-helper conventions as an interceptor or base controller
- [ ] [#1172](https://github.com/CIVRA-INC/LumenHealth/issues/1172) — [30] Migrate JWT signing/verification (`token.service.ts`) into a Nest-friendly provider
- [ ] [#1173](https://github.com/CIVRA-INC/LumenHealth/issues/1173) — [31] Audit and port any `bcryptjs` password-hashing usage into a `PasswordService`
- [ ] [#1174](https://github.com/CIVRA-INC/LumenHealth/issues/1174) — [32] Define a shared `PermissionsModule` exporting role-policy lookups

## Epic 3 — Auth Module Migration

- [ ] [#1175](https://github.com/CIVRA-INC/LumenHealth/issues/1175) — [33] Scaffold `AuthModule` and register its providers
- [ ] [#1176](https://github.com/CIVRA-INC/LumenHealth/issues/1176) — [34] Port `identityStore` to an injectable `IdentityRepository`
- [ ] [#1177](https://github.com/CIVRA-INC/LumenHealth/issues/1177) — [35] Port `sessionStore` to an injectable `SessionRepository`
- [ ] [#1178](https://github.com/CIVRA-INC/LumenHealth/issues/1178) — [36] **Flag as risk:** in-memory stores don't survive multi-instance/restart — decide fix or accept
- [ ] [#1179](https://github.com/CIVRA-INC/LumenHealth/issues/1179) — [37] Port `POST /register` to `AuthController#register`
- [ ] [#1180](https://github.com/CIVRA-INC/LumenHealth/issues/1180) — [38] Port `POST /login` to `AuthController#login`, including rate limiting
- [ ] [#1181](https://github.com/CIVRA-INC/LumenHealth/issues/1181) — [39] Design and implement rate limiting as a reusable Nest mechanism
- [ ] [#1182](https://github.com/CIVRA-INC/LumenHealth/issues/1182) — [40] Port `POST /logout` to `AuthController#logout`
- [ ] [#1183](https://github.com/CIVRA-INC/LumenHealth/issues/1183) — [41] Port `GET /me` to `AuthController#me`, guarded
- [ ] [#1184](https://github.com/CIVRA-INC/LumenHealth/issues/1184) — [42] Port `GET /owner-only` to `AuthController#ownerOnly`
- [ ] [#1185](https://github.com/CIVRA-INC/LumenHealth/issues/1185) — [43] Port `accountStatusError` (`account-status.service.ts`) to `AccountStatusService`
- [ ] [#1186](https://github.com/CIVRA-INC/LumenHealth/issues/1186) — [44] Port `POST /refresh` to `AuthController#refresh`, including reuse detection
- [ ] [#1187](https://github.com/CIVRA-INC/LumenHealth/issues/1187) — [45] Port session cleanup (`session-cleanup.service.ts`) to a Nest scheduled task
- [ ] [#1188](https://github.com/CIVRA-INC/LumenHealth/issues/1188) — [46] Port `POST /password-reset/request` and `/confirm`
- [ ] [#1189](https://github.com/CIVRA-INC/LumenHealth/issues/1189) — [47] Port `POST /verify/request` and `/verify/complete`
- [ ] [#1190](https://github.com/CIVRA-INC/LumenHealth/issues/1190) — [48] Port `GET /metrics` and `metrics.service.ts`
- [ ] [#1191](https://github.com/CIVRA-INC/LumenHealth/issues/1191) — [49] Port the Express `errorHandler` catch-all to the global exception filter
- [ ] [#1192](https://github.com/CIVRA-INC/LumenHealth/issues/1192) — [50] Port `_resetAuthStateForTests` as a Nest-testable reset hook

## Epic 4 — Clinic Module Migration

- [ ] [#1193](https://github.com/CIVRA-INC/LumenHealth/issues/1193) — [51] Scaffold `ClinicModule`
- [ ] [#1194](https://github.com/CIVRA-INC/LumenHealth/issues/1194) — [52] Port `clinicStore`/repository to an injectable `ClinicRepository`
- [ ] [#1195](https://github.com/CIVRA-INC/LumenHealth/issues/1195) — [53] Port `POST /clinics` (create) to `ClinicController#create`
- [ ] [#1196](https://github.com/CIVRA-INC/LumenHealth/issues/1196) — [54] Port `GET /clinics/:clinicId` (get) to `ClinicController#get`
- [ ] [#1197](https://github.com/CIVRA-INC/LumenHealth/issues/1197) — [55] Port `PATCH /clinics/:clinicId` (update) to `ClinicController#update`
- [ ] [#1198](https://github.com/CIVRA-INC/LumenHealth/issues/1198) — [56] Port `DELETE /clinics/:clinicId` (archive) to `ClinicController#archive`
- [ ] [#1199](https://github.com/CIVRA-INC/LumenHealth/issues/1199) — [57] Port `clinic.service.ts` business logic to `ClinicService`
- [ ] [#1200](https://github.com/CIVRA-INC/LumenHealth/issues/1200) — [58] Port `clinic.validator.ts` to DTOs/pipes
- [ ] [#1201](https://github.com/CIVRA-INC/LumenHealth/issues/1201) — [59] Confirm clinic-scope guard param binding across all clinic routes
- [ ] [#1202](https://github.com/CIVRA-INC/LumenHealth/issues/1202) — [60] Port clinic-module tests (`clinic.controller.test.ts`)

## Epic 5 — Staff Module Migration

- [ ] [#1203](https://github.com/CIVRA-INC/LumenHealth/issues/1203) — [61] Scaffold `StaffModule` (and `InvitationsModule` per issue #3's decision)
- [ ] [#1204](https://github.com/CIVRA-INC/LumenHealth/issues/1204) — [62] Port `staffStore`/repository to `StaffRepository`
- [ ] [#1205](https://github.com/CIVRA-INC/LumenHealth/issues/1205) — [63] Port `GET /staff` (list) to `StaffController#list`
- [ ] [#1206](https://github.com/CIVRA-INC/LumenHealth/issues/1206) — [64] Port `PATCH /staff/:staffId/role` to `StaffController#updateRole`
- [ ] [#1207](https://github.com/CIVRA-INC/LumenHealth/issues/1207) — [65] Port `staff.service.ts` business logic to `StaffService`
- [ ] [#1208](https://github.com/CIVRA-INC/LumenHealth/issues/1208) — [66] Port `POST /staff/invitations` (send) to `InvitationController#send`
- [ ] [#1209](https://github.com/CIVRA-INC/LumenHealth/issues/1209) — [67] Port `GET /staff/invitations` (list) to `InvitationController#list`
- [ ] [#1210](https://github.com/CIVRA-INC/LumenHealth/issues/1210) — [68] Port `POST /staff/invitations/accept` to `InvitationController#accept`
- [ ] [#1211](https://github.com/CIVRA-INC/LumenHealth/issues/1211) — [69] Port `DELETE /staff/invitations/:invitationId` (revoke) to `InvitationController#revoke`
- [ ] [#1212](https://github.com/CIVRA-INC/LumenHealth/issues/1212) — [70] Port `invitation.repository.ts` to `InvitationRepository`
- [ ] [#1213](https://github.com/CIVRA-INC/LumenHealth/issues/1213) — [71] Port `invitation.service.ts` business logic to `InvitationService`
- [ ] [#1214](https://github.com/CIVRA-INC/LumenHealth/issues/1214) — [72] Port `invitation.validator.ts` to DTOs/pipes
- [ ] [#1215](https://github.com/CIVRA-INC/LumenHealth/issues/1215) — [73] Reconcile staff-module role/permission checks with the new `PermissionsGuard`
- [ ] [#1216](https://github.com/CIVRA-INC/LumenHealth/issues/1216) — [74] Port staff-module tests (`staff.controller.test.ts`, `invitation.controller.test.ts`)

## Epic 6 — Audit Module Migration, incl. Stellar Anchoring

- [ ] [#1217](https://github.com/CIVRA-INC/LumenHealth/issues/1217) — [75] Scaffold `AuditModule` (public) and confirm its relationship to `/internal/audit`
- [ ] [#1218](https://github.com/CIVRA-INC/LumenHealth/issues/1218) — [76] Port `GET /audit` (list) to `AuditController#list`
- [ ] [#1219](https://github.com/CIVRA-INC/LumenHealth/issues/1219) — [77] Port `GET /audit/export` to `AuditController#exportAuditLog`
- [ ] [#1220](https://github.com/CIVRA-INC/LumenHealth/issues/1220) — [78] Port `requireInternalServiceToken` to an `InternalServiceTokenGuard`
- [ ] [#1221](https://github.com/CIVRA-INC/LumenHealth/issues/1221) — [79] Port `auditStore`/`AuditRepository`, including Merkle/anchoring fields
- [ ] [#1222](https://github.com/CIVRA-INC/LumenHealth/issues/1222) — [80] Port `recordAudit` and the "critical action" immediate-anchor fire-and-forget path
- [ ] [#1223](https://github.com/CIVRA-INC/LumenHealth/issues/1223) — [81] Port `anchorImmediately` with its injectable-anchor-function seam
- [ ] [#1224](https://github.com/CIVRA-INC/LumenHealth/issues/1224) — [82] Port `verifyAuditEntry` — the tamper/anchor/verified state machine
- [ ] [#1225](https://github.com/CIVRA-INC/LumenHealth/issues/1225) — [83] Port `GET /audit/:auditId/verify` to `AuditController#verify`
- [ ] [#1226](https://github.com/CIVRA-INC/LumenHealth/issues/1226) — [84] Port `POST /audit/verify-export` to `AuditController#verifyExport` — deliberately unauthenticated
- [ ] [#1227](https://github.com/CIVRA-INC/LumenHealth/issues/1227) — [85] Port `GET /audit/anchoring-health` to `AuditController#anchoringHealth`
- [ ] [#1228](https://github.com/CIVRA-INC/LumenHealth/issues/1228) — [86] Port `GET /internal/audit/unanchored` and `POST /internal/audit/anchor-result`
- [ ] [#1229](https://github.com/CIVRA-INC/LumenHealth/issues/1229) — [87] Port `stellar-verifier.client.ts` to an injectable `StellarVerifierClient`
- [ ] [#1230](https://github.com/CIVRA-INC/LumenHealth/issues/1230) — [88] Wire `x-internal-service-token` header consistently for outbound stellar-service calls
- [ ] [#1231](https://github.com/CIVRA-INC/LumenHealth/issues/1231) — [89] Port `computeEntriesDigest` and export-manifest signing flow
- [ ] [#1232](https://github.com/CIVRA-INC/LumenHealth/issues/1232) — [90] Port `buildAuditExport` to `AuditService#buildAuditExport`
- [ ] [#1233](https://github.com/CIVRA-INC/LumenHealth/issues/1233) — [91] Port `isCriticalAuditAction` usage/definition audit
- [ ] [#1234](https://github.com/CIVRA-INC/LumenHealth/issues/1234) — [92] Port audit-module test suites (7 files)

## Epic 7 — Shared/Common Utilities & Workspace Boundaries

- [ ] [#1235](https://github.com/CIVRA-INC/LumenHealth/issues/1235) — [93] Port `role-policies.ts` into a shared, DI-friendly location
- [ ] [#1236](https://github.com/CIVRA-INC/LumenHealth/issues/1236) — [94] Update `packages/config/check-workspace-boundaries.cjs` for the new module layout
- [ ] [#1237](https://github.com/CIVRA-INC/LumenHealth/issues/1237) — [95] Confirm `@lumen/types` and `@lumen/config` need no changes for Nest consumption
- [ ] [#1238](https://github.com/CIVRA-INC/LumenHealth/issues/1238) — [96] Port `e2e-flows.test.ts` as an end-to-end test against the Nest app
- [ ] [#1239](https://github.com/CIVRA-INC/LumenHealth/issues/1239) — [97] Port `clinic-isolation.test.ts` as a dedicated multi-tenancy regression suite
- [ ] [#1240](https://github.com/CIVRA-INC/LumenHealth/issues/1240) — [98] Consolidate `@lumen/types` `express-serve-static-core` module augmentation removal

## Epic 8 — Testing Migration & Infrastructure

- [ ] [#1241](https://github.com/CIVRA-INC/LumenHealth/issues/1241) — [99] Decide: keep Vitest or migrate to Jest for the Nest app
- [ ] [#1242](https://github.com/CIVRA-INC/LumenHealth/issues/1242) — [100] Set up `@nestjs/testing` module-testing conventions and a shared test-utils file
- [ ] [#1243](https://github.com/CIVRA-INC/LumenHealth/issues/1243) — [101] Port auth-module test suites (6 files, excluding fixtures)
- [ ] [#1244](https://github.com/CIVRA-INC/LumenHealth/issues/1244) — [102] Port `fixtures.ts`/`fixtures.test.ts` test fixtures to DI-friendly factories
- [ ] [#1245](https://github.com/CIVRA-INC/LumenHealth/issues/1245) — [103] Port clinic and staff module test suites
- [ ] [#1246](https://github.com/CIVRA-INC/LumenHealth/issues/1246) — [104] Port audit module test suites
- [ ] [#1247](https://github.com/CIVRA-INC/LumenHealth/issues/1247) — [105] Set up test coverage reporting/thresholds for the new Nest app
- [ ] [#1248](https://github.com/CIVRA-INC/LumenHealth/issues/1248) — [106] Add contract/parity tests comparing old Express and new Nest responses
- [ ] [#1249](https://github.com/CIVRA-INC/LumenHealth/issues/1249) — [107] Load-test the ported Auth and Audit modules before cutover
- [ ] [#1250](https://github.com/CIVRA-INC/LumenHealth/issues/1250) — [108] CI: add a NestJS app job to `.github/workflows/ci.yml`

## Epic 9 — Observability & Health

- [ ] [#1251](https://github.com/CIVRA-INC/LumenHealth/issues/1251) — [109] Reconcile `GET /health` response with any container/orchestrator health-check expectations
- [ ] [#1252](https://github.com/CIVRA-INC/LumenHealth/issues/1252) — [110] Add readiness checks for external dependencies (stellar-service reachability)
- [ ] [#1253](https://github.com/CIVRA-INC/LumenHealth/issues/1253) — [111] Standardize structured logging across all modules using the ported logger (issue #27)
- [ ] [#1254](https://github.com/CIVRA-INC/LumenHealth/issues/1254) — [112] Add request/response correlation IDs end-to-end (auth logs → audit entries)
- [ ] [#1255](https://github.com/CIVRA-INC/LumenHealth/issues/1255) — [113] Document and dashboard the auth metrics after migration

## Epic 10 — DevOps, Build & Tooling

- [ ] [#1256](https://github.com/CIVRA-INC/LumenHealth/issues/1256) — [114] Fix or implement the missing `scripts/issues/render-batch.mjs` and `publish-batch.mjs`
- [ ] [#1257](https://github.com/CIVRA-INC/LumenHealth/issues/1257) — [115] Convert this 125-issue backlog into the structured input format from issue #114
- [ ] [#1258](https://github.com/CIVRA-INC/LumenHealth/issues/1258) — [116] Add a Dockerfile / update container build for the new Nest app
- [ ] [#1259](https://github.com/CIVRA-INC/LumenHealth/issues/1259) — [117] Update `.github/workflows/lint-format-typecheck.yml` (or equivalent) for the new package
- [ ] [#1260](https://github.com/CIVRA-INC/LumenHealth/issues/1260) — [118] Add ESLint config for the Nest app matching repo conventions
- [ ] [#1261](https://github.com/CIVRA-INC/LumenHealth/issues/1261) — [119] Decommission the Express `apps/api` package once cutover completes

## Epic 11 — Cutover, Documentation & Final Cleanup

- [ ] [#1262](https://github.com/CIVRA-INC/LumenHealth/issues/1262) — [120] Cutover: Clinic module (lowest-risk, no external dependencies)
- [ ] [#1263](https://github.com/CIVRA-INC/LumenHealth/issues/1263) — [121] Cutover: Staff & Invitations module
- [ ] [#1264](https://github.com/CIVRA-INC/LumenHealth/issues/1264) — [122] Cutover: Auth module (session/token compatibility is the critical risk)
- [ ] [#1265](https://github.com/CIVRA-INC/LumenHealth/issues/1265) — [123] Cutover: Audit module (external Stellar dependency, highest business-criticality)
- [ ] [#1266](https://github.com/CIVRA-INC/LumenHealth/issues/1266) — [124] Coordinate `apps/web` and `apps/mobile` for any observable API changes
- [ ] [#1267](https://github.com/CIVRA-INC/LumenHealth/issues/1267) — [125] Final documentation pass: update README, architecture docs, and close out the migration
