# UI Audit Table (Standalone)

High-density React audit table component for contributor practice.

## Files

- `AuditTable.jsx` reusable component
- `auditData.js` sample log dataset
- `App.jsx` demo wrapper

## Features

- Dense table optimized for scanability
- Local filters:
  - Action type dropdown
  - Search (user, resource, IP)
- States:
  - Loading
  - Empty results
- No dependency on app routes/providers

## Usage

Import `AuditTable` in any React sandbox/project and pass:

```jsx
<AuditTable rows={rows} loading={false} />
```
