# Role-Based Access Control (RBAC) Model

> This document defines the RBAC model for LumenHealth. It must be updated whenever roles, permissions, or access policies change.

## Role Hierarchy

```
owner > admin > clinician > cashier
```

Each higher role inherits all permissions of lower roles unless explicitly restricted.

## Role Definitions

### Owner
- **Scope**: Full system access across all clinics owned
- **Who**: Clinic owner / practice manager
- **Key Capabilities**:
  - Manage clinic settings and billing
  - Add/remove admins and other users
  - Access all patient records within their clinics
  - View audit logs and security events
  - Manage integrations (Stellar payments, etc.)
  - Transfer or delete clinic data

### Admin
- **Scope**: Clinic-level administrative access
- **Who**: Office manager, head nurse, IT admin
- **Key Capabilities**:
  - Manage clinician and cashier accounts within their clinic
  - Configure clinic-specific settings (not billing)
  - Access all patient records within their clinic
  - View audit logs for their clinic
  - Manage appointment schedules
  - Override certain clinical workflows (e.g., re-open completed visit)

### Clinician
- **Scope**: Clinical operations
- **Who**: Doctors, nurses, pharmacists, lab technicians
- **Key Capabilities**:
  - View/edit patient records assigned to them
  - Create clinical notes, prescriptions, lab orders
  - View patient history and visit records
  - Record vitals and clinical observations
  - Access clinical decision support tools

### Cashier
- **Scope**: Financial operations only
- **Who**: Front desk, billing staff
- **Key Capabilities**:
  - Process payments (cash, Stellar crypto)
  - Generate invoices and receipts
  - View payment history
  - Manage appointment bookings
  - View basic patient info (name, ID) for billing

## Permission Matrix

| Resource / Action | Owner | Admin | Clinician | Cashier |
|-------------------|-------|-------|-----------|---------|
| **Auth** | | | | |
| Login | ✅ | ✅ | ✅ | ✅ |
| Change own password | ✅ | ✅ | ✅ | ✅ |
| Reset other's password | ✅ | ✅ | ❌ | ❌ |
| **Users** | | | | |
| Create user | ✅ | ✅ (same clinic) | ❌ | ❌ |
| Delete user | ✅ | ✅ (same clinic) | ❌ | ❌ |
| Assign roles | ✅ | ✅ (≤ own role) | ❌ | ❌ |
| View user list | ✅ | ✅ | ❌ | ❌ |
| **Patients** | | | | |
| Create patient | ✅ | ✅ | ✅ | ✅ |
| View patient records | ✅ (all clinics) | ✅ (own clinic) | ✅ (assigned) | ⚠️ (basic only) |
| Edit patient records | ✅ | ✅ | ✅ | ❌ |
| Delete patient records | ✅ | ❌ | ❌ | ❌ |
| **Clinical** | | | | |
| Create clinical notes | ✅ | ❌ | ✅ | ❌ |
| Create prescriptions | ✅ | ❌ | ✅ | ❌ |
| Order lab tests | ✅ | ❌ | ✅ | ❌ |
| **Payments** | | | | |
| Process payment | ✅ | ✅ | ❌ | ✅ |
| View payment history | ✅ | ✅ | ❌ | ✅ (own transactions) |
| Refund | ✅ | ✅ | ❌ | ❌ |
| **Clinic Settings** | | | | |
| Edit clinic settings | ✅ | ⚠️ (limited) | ❌ | ❌ |
| Manage billing | ✅ | ❌ | ❌ | ❌ |
| Manage integrations | ✅ | ❌ | ❌ | ❌ |
| **Audit** | | | | |
| View audit logs | ✅ | ✅ (own clinic) | ❌ | ❌ |
| Export audit logs | ✅ | ❌ | ❌ | ❌ |

Legend: ✅ = Allowed, ❌ = Denied, ⚠️ = Restricted/Conditional

## Implementation Architecture

### Current State (Milestone 0)

The current implementation is a stub:
- `UserRole` type defined in `@lumen/types`: `"owner" | "admin" | "clinician" | "cashier"`
- Login endpoint returns hardcoded session with `role: "owner"`
- No middleware for role checking
- No persistent sessions

### Planned Implementation (Auth MVP)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Request    │────▶│  AuthGuard   │────▶│  RoleGuard   │
│             │     │  Middleware   │     │  Middleware   │
└─────────────┘     └──────────────┘     └─────────────┘
                           │                     │
                    ┌──────▼──────┐       ┌──────▼──────┐
                    │  Validate   │       │  Check role │
                    │  JWT token  │       │  against    │
                    │             │       │  route ACL  │
                    └─────────────┘       └─────────────┘
```

1. **AuthGuard Middleware**: Validates JWT, extracts `userId`, `clinicId`, `role`
2. **RoleGuard Middleware**: Checks if `role` is allowed for the route
3. **ClinicScope Middleware**: Ensures data access is scoped to user's clinic

### Route Protection Pattern

```typescript
// Example: Admin-only route
router.delete("/api/v1/users/:id", 
  authGuard,
  roleGuard(["owner", "admin"]),
  userController.delete
);

// Example: Clinician route with clinic scoping
router.get("/api/v1/patients/:id/records",
  authGuard,
  roleGuard(["owner", "admin", "clinician"]),
  clinicScope,
  patientController.getRecords
);
```

## Clinic Scoping

All data access must be scoped to the user's clinic unless the user is an `owner` with multi-clinic access.

- **Single-clinic users** (admin, clinician, cashier): Can only access data where `clinicId` matches their session
- **Multi-clinic owners**: Can access data across all clinics they own
- **Cross-clinic access**: Explicitly denied unless user has owner role AND owns the target clinic

## Future Considerations

- **Custom roles**: Allow clinic owners to define custom roles with granular permissions
- **Permission inheritance**: Implement role hierarchy with explicit deny overrides
- **Time-based access**: Restrict certain actions to business hours
- **IP-based restrictions**: Limit admin access to trusted networks
- **MFA requirement**: Require MFA for admin and owner roles

---

*Last updated: 2026-05-27*
*Next review: Auth MVP milestone*
