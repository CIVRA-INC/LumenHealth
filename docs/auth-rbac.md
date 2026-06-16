# Auth RBAC Baseline (rougepandaq)

Covers: #500, #501, #502, #503

## RBAC Model (First Pass)
- `clinic_admin`: full clinic management and contributor invite authority.
- `clinician`: patient-care actions within assigned clinic scope.
- `staff`: operational access with no privilege elevation rights.

## Ownership Bootstrap Rule
- First verified account for a clinic becomes `clinic_admin`.
- Subsequent accounts require invitation or explicit role assignment.

## Authorization Decision Logging
- Log denied checks with actor role, target resource, and policy reason.
- Log elevated checks where admin-level paths are exercised.

## Shared Fixtures
- `rbac_admin_fixture`
- `rbac_clinician_fixture`
- `rbac_staff_fixture`
- Include expected allow/deny policy assertions per fixture.
