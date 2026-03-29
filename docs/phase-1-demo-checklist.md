# Phase 1 Demo Checklist

## Setup

1. Install dependencies from the repository root.
2. Start MongoDB locally.
3. Run the API and web apps.
4. Optionally seed demo data with `npm run seed:demo -w apps/api`.

## Demo Flow

1. Register a clinic from `/register`.
2. Log in as the clinic admin.
3. Open the patient registry and create a patient if seed data is not used.
4. Start an encounter from the patient page or patient search results.
5. Open the queue board and confirm the visit appears there.
6. Capture vitals, add notes, and attach a diagnosis.
7. Open the encounter page and confirm the summary and alert surfaces render.
8. Close the encounter.
9. Open the patient timeline and confirm the encounter appears there.
10. Visit billing and generate a Stellar payment intent.
11. Open audit logs and confirm mutation activity is visible.

## Acceptance Checks

- Clinic registration returns a working session.
- Patient creation works from the web UI.
- Encounter creation opens a usable clinical workspace.
- Queue, notes, vitals, and diagnoses routes all load without crashing.
- Audit logs show recent mutating actions.
- Billing generates a Stellar payment payload.
