# Device Matrix Plan — LumenHealth MVP

## Supported Devices

### iOS

| Device     | OS Version | Priority |
|------------|------------|----------|
| iPhone 15  | iOS 17     | P0       |
| iPhone 14  | iOS 17     | P0       |
| iPhone 14  | iOS 16     | P1       |
| iPhone 13  | iOS 16     | P1       |
| iPhone 12  | iOS 16     | P2       |

### Android

| Device           | Android Version | Priority |
|------------------|-----------------|----------|
| Pixel 6          | Android 13      | P0       |
| Samsung Galaxy S22 | Android 13    | P0       |
| OnePlus 11       | Android 13      | P1       |
| Pixel 6          | Android 12      | P1       |
| Samsung Galaxy S22 | Android 12    | P2       |
| OnePlus 11       | Android 14      | P2       |

## Priority Matrix

| Priority | Definition              | Expectation                       |
|----------|-------------------------|-----------------------------------|
| P0       | Must work               | Blocking — all flows pass QA      |
| P1       | Should work             | Non-blocking — critical flows only|
| P2       | Nice to have            | Best effort, no release blocker   |

## Testing Cadence

- **P0 devices** — tested on every PR merge to `main` via CI (EAS Build + detox or manual smoke)
- **P1 devices** — tested before every sprint release cut
- **P2 devices** — tested before major version releases (e.g., 1.0, 2.0)
- **Ad-hoc** — reported device issues triaged within one sprint
