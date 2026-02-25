# RBAC Matrix Evaluator

Standalone role/action permission evaluator for contributors.

## Run checks

```bash
npm run check -- --role=CLINIC_ADMIN --action=staff.create
```

- Exit code `0`: action allowed
- Exit code `2`: action denied / unknown role / unknown action

## Run tests

```bash
npm run test
```

## Notes

- Permission matrix is stored in `matrix.json`.
- Includes 6 roles and 17 actions.
- Use `can(role, action)` from `rbac-matrix.js` for programmatic checks.
