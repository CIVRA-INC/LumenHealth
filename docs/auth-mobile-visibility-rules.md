# Auth Mobile Visibility Rules

Role-aware mobile visibility baseline:

| Role | Home Card Visibility |
|---|---|
| owner | clinic-summary, billing-summary, team-actions |
| admin | clinic-summary, team-actions |
| clinician | patient-queue, encounter-actions |
| cashier | billing-summary, payment-actions |

## UX Contract
- Missing permission should hide restricted cards.
- Direct route attempts should receive forbidden-state response and map to a non-crashing fallback view.
