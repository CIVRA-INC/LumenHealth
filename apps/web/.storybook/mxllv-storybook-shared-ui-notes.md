# mxllv Storybook notes: shared auth, audit and verify UI states (#1519)

This folder provides an isolated Storybook story module (`mxllv-auth-audit-verify-ui-states.stories.tsx`) that documents shared UI states:
- **Auth:** signed-out, authenticating, signed-in, error
- **Audit:** idle, recording, recorded, failed
- **Verify:** unverified, pending, verified, rejected

The story is self-contained and does not wire into existing app routes or global Storybook config. Integrate by adding the stories glob/config in the app-level Storybook setup when adopted.
