# Module format and build toolchain for `@lumen/api`

Decision record for [#1157](https://github.com/CIVRA-INC/LumenHealth/issues/1157) and the
Turbo script wiring for [#1158](https://github.com/CIVRA-INC/LumenHealth/issues/1158).

## Decision

`@lumen/api` is a **native ESM** package. It keeps `"type": "module"` in
`apps/api/package.json` and builds with plain `tsc` under
`module`/`moduleResolution: NodeNext`.

Nest's CLI is **not** the build tool. `@nestjs/cli` is already a devDependency (the
scaffold scripts in `apps/api/` use it), but `nest build` / `nest start` wrap the
compiler and their ESM handling has changed shape across Nest majors, so this package
uses the same `tsc -p <tsconfig>` invocation as every other workspace in the repo. Nest
does not need its CLI at runtime — the framework is `@nestjs/core`, not the CLI.

The rejected alternative was falling back to CommonJS output for the Nest service. That
would have been more work and less consistent: `@lumen/config`, `@lumen/types` and
`@lumen/stellar-service` are all `"type": "module"` packages that `apps/api` imports, so
a CJS `apps/api` would need interop shims at every one of those boundaries.

Consequences of native ESM, all of which the codebase already satisfies:

- relative imports carry explicit `.js` extensions (`from "./modules/auth/routes/index.js"`);
- there is no `require()` of workspace packages and no `__dirname` in `apps/api/src`;
- `dist` output is ESM and runs under `node` directly — no bundler, no transpile step at
  startup.

## What the migration left behind

`apps/api/tsconfig.json` was inherited unchanged from the pre-Nest Express template, so
none of the compiler options Nest depends on were present. Nest resolves constructor
dependencies through `design:paramtypes` metadata emitted by
`emitDecoratorMetadata`; without it there is nothing for the injector to read. The
following are now set in `apps/api/tsconfig.json`:

| option | why |
| --- | --- |
| `experimentalDecorators: true` | legacy (TC39 stage 1) decorators, which is what `@Injectable()` / `@Controller()` / `@Inject()` are written against. |
| `emitDecoratorMetadata: true` | emits `design:paramtypes`, which is what Nest's dependency injector reads. Required, not optional. |
| `useDefineForClassFields: false` | `target: ES2022` defaults this to `true`. Under `define` semantics a declared class field is installed with `Object.defineProperty` and overwrites whatever the container assigned to it, so `@Inject()` **field** injection breaks. Nest's own scaffolds pin this to `false`. The current code only uses constructor parameter properties, which are unaffected either way — this is here so the next person who reaches for field injection does not get a runtime `undefined` that the type-checker happily accepts. |

## Build vs. typecheck configs

Two tsconfigs, so that neither job is compromised:

- `apps/api/tsconfig.json` — includes `src/**/*.ts`, tests included. Used by `typecheck`,
  so the test files stay type-checked in CI.
- `apps/api/tsconfig.build.json` — extends the above and excludes `**/*.test.ts`,
  `**/tests/**` and `**/__tests__/**`. Used by `build`, so `dist` contains only the
  runnable application and not a compiled copy of every test file.

`build` writing tests into `dist` was harmless while the package was type-only, but
`dist` is the published artefact for a service that gets `node dist/server.js`-ed, and
`turbo.json` caches `build` on `outputs: ["dist/**"]` — so the test files were being
cached and shipped as part of the build output.

## Entry point

The entry file is `src/server.ts`, so the built entry is **`dist/server.js`**, and that
is what the `start` script runs. (Nest's own convention is `src/main.ts` → `dist/main.js`;
this package is mid-migration and has kept its existing entry filename.)

## Turbo script contract

`turbo.json` already declares `dev`, `build`, `lint`, `typecheck` and `test`, with
`build` depending on `^build` so `@lumen/config` and `@lumen/types` are compiled before
`@lumen/api` is. `apps/api/package.json` uses exactly those script names, so
`turbo run build --filter=@lumen/api` and `turbo run test --filter=@lumen/api` work with
no change to the root pipeline.

| script | command | turbo task | notes |
| --- | --- | --- | --- |
| `dev` | `tsx watch src/server.ts` | `dev` | `cache: false`, `persistent: true`. |
| `build` | `tsc -p tsconfig.build.json` | `build` | outputs `dist/**`. |
| `start` | `node dist/server.js` | — | deliberately **not** a turbo task: a `start` task would be dispatched to every workspace at once, including `next start` in `@lumen/web` and a mobile app with no server. Run it directly against a built `dist`. |
| `typecheck` | `tsc -p tsconfig.json --noEmit` | `typecheck` | covers tests. |
| `lint` | `eslint src` | `lint` | `apps/api/eslint.config.js` already ignores `dist/**`. |
| `test` | `vitest run` | `test` | `vitest.config.ts` supplies `JWT_SECRET` / `INTERNAL_SERVICE_TOKEN` in `env`, so the suite does not need a `.env`. |

`@lumen/api` is the only workspace with all six scripts. Gaps elsewhere are not
addressed here: `@lumen/mobile` has no `test` (and no vitest dependency to back one),
`@lumen/stellar-service` has no `start`, `@lumen/types` has no `lint`. Adding a script
name that the package cannot actually run would break the pipeline that this issue asks
to keep working, so those are separate work.

## Open question: decorator metadata under `tsx`

`build` and `start` go through `tsc`, which definitely emits `design:paramtypes`. `dev`
does not: `tsx` transpiles with esbuild, which does not run the type-checker, and
`emitDecoratorMetadata` is a compiler feature rather than a syntax transform.

If `npm run dev` fails to resolve dependencies with `Nest can't resolve dependencies
of the <Provider> (?)`, that is the cause, and the two fixes are either

- `tsc -p tsconfig.build.json --watch` alongside `node --watch dist/server.js` (no new
  dependency, but two processes, so it wants a small runner script or a `concurrently`
  devDependency), or
- `@swc/cli` with `jsc.transform.decoratorMetadata: true` via a `.swcrc`.

This was not verified locally — see the Validation section of the PR. The `tsc` path is
what CI and `turbo run build` use, so it is the one the acceptance criteria are met on.
