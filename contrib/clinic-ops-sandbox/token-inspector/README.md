# Token Inspector

Standalone JWT claims inspector for contributor onboarding.

## Run

```bash
npm run inspect -- <jwt>
npm run inspect -- <jwt> --secret=your-hs256-secret
```

## What it does

- Decodes JWT `header` and `payload`.
- Optionally verifies signature for HS256 when `--secret` is provided.
- Validates required claims: `userId`, `role`, `clinicId`, `exp`.
- Outputs structured JSON for success and failure.

## Example

```bash
npm run inspect -- eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.... --secret=my-secret
```
