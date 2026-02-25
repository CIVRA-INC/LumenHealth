# Stellar Memo Guard

Standalone validator for Stellar payment memo safety.

## Run

```bash
npm run check -- --expected=<memo> --submitted=<memo>
npm run check -- --expected=<memo> --submitted=<memo> --case-sensitive=false
npm run test
```

## What it checks

- Format validation: memo must be 64 hex characters (`0-9`, `a-f`).
- Whitespace diagnostics: leading/trailing spaces are rejected.
- Match validation:
  - `MATCH` when submitted memo is correct.
  - `MEMO_MISMATCH` when value differs.
  - `INVALID_MEMO_FORMAT` when either memo format is invalid.

## Exit Codes

- `0` => payment can be credited (`MATCH`)
- `2` => cannot credit (`MEMO_MISMATCH` or `INVALID_MEMO_FORMAT`)
