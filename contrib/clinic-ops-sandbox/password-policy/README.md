# Password Policy Linter

Standalone password validator for contributor onboarding.

## Rules

- Length: 8 to 128 characters
- Must include uppercase, lowercase, number, and symbol
- Must not match common-password blacklist

## Output

The linter returns:

- `valid` (boolean)
- `score` (0-4)
- `issues` (granular failure reasons)
- `checks` (per-rule pass/fail)

## Run

```bash
npm run lint -- --password='Clin!cSecure2026'
npm run test
```

- Exit code `0`: valid password
- Exit code `2`: invalid password
