# UI Staff Badges (Standalone)

Typed, reusable role and status badges for staff management interfaces.

## Files

- `types.ts` strict role/status unions
- `StaffBadges.tsx` reusable `RoleBadge` and `StatusBadge`
- `App.tsx` demo rendering all variants

## Accessibility

- Badges include semantic `role=\"status\"` and `aria-label` text.
- Color choices are high-contrast for quick scanning.

## Usage

```tsx
import { RoleBadge, StatusBadge } from "./StaffBadges";

<RoleBadge role="CLINIC_ADMIN" />
<StatusBadge status="ACTIVE" />
```
