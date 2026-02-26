# Mock Clinic Settings API

Standalone API emulator for clinic settings contract testing.

## Run

```bash
cd /Users/assad/Documents/GitHub/drip2/LumenHealth/contrib/clinic-ops-sandbox/mock-clinic-settings-api
npm run start
```

Default server: `http://localhost:4010`

## Routes

- `GET /health`
- `GET /clinics/me`
- `PATCH /clinics/me`

## Auth Simulation

Send both headers on protected routes:

- `x-user-role`
- `x-clinic-id`

PATCH requires `x-user-role: CLINIC_ADMIN`.

## Example curl

Read clinic:

```bash
curl -s http://localhost:4010/clinics/me \
  -H "x-user-role: DOCTOR" \
  -H "x-clinic-id: clinic_001"
```

Attempt forbidden patch:

```bash
curl -s -X PATCH http://localhost:4010/clinics/me \
  -H "Content-Type: application/json" \
  -H "x-user-role: NURSE" \
  -H "x-clinic-id: clinic_001" \
  -d '{"contact":"+256-700-999-999"}'
```

Successful patch:

```bash
curl -s -X PATCH http://localhost:4010/clinics/me \
  -H "Content-Type: application/json" \
  -H "x-user-role: CLINIC_ADMIN" \
  -H "x-clinic-id: clinic_001" \
  -d '{"contact":"+256-700-999-999"}'
```

## Error Contract

- `401` Unauthorized
- `403` Forbidden
- `400` BadRequest
- `404` NotFound
- `405` MethodNotAllowed
