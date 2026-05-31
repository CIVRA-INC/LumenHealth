# Auth Web Navigation Rules

Role-aware navigation baseline for web shell:

| Role | Default Landing | Visible Primary Sections |
|---|---|---|
| owner | `/dashboard` | Dashboard, Team, Billing, Patients |
| admin | `/dashboard` | Dashboard, Team, Patients |
| clinician | `/patients` | Patients, Schedule, Records |
| cashier | `/billing` | Billing, Receipts |

## Forbidden Contract
- Unauthorized navigation should map to a deterministic forbidden state payload:
  - `error: "AUTH_FORBIDDEN"`
  - `message: "insufficient permission"`
