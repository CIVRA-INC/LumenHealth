# Auth Role Catalog

Initial role catalog for auth and route protection:

| Role | Scope | Typical Actions |
|---|---|---|
| `owner` | Tenant-wide | manage billing, team members, security posture |
| `admin` | Tenant-wide delegated | manage users, settings, operational tasks |
| `clinician` | Patient-care scoped | clinical workflows, encounter updates |
| `cashier` | Billing scoped | payment collection, invoice status updates |

## Guardrail
- Every protected route should map to one or more of these roles.
- Unknown roles should default to deny.
