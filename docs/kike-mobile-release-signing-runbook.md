# LumenHealth Mobile Release Signing and Release Runbook (iOS & Android)

> Standalone runbook for [RB-082] / issue #1538. This document defines where signing material lives, who owns it, and how to build/release safely. It is intended to be linked from `apps/mobile/README.md` when mobile release wiring is integrated.

## Scope
- iOS certificates & provisioning profiles, TestFlight/App Store flow.
- Android keystores, Play App Signing, Play Console tracks.
- EAS managed credentials (if Expo/EAS chosen) and manual fallback.
- Rotation/revocation and emergency response.

## Credential storage & owners
| Platform | Artifact | Primary store | Access owners | Backup/escalation |
|---|---|---|---|---|
| iOS | Distribution certificate (.p12), Apple API key (App Store Connect) | EAS credentials (managed) + org password manager/vault entry (encrypted export) | Mobile lead, Release engineer, Security approver | Break-glass access via org vault recovery policy; audit access quarterly |
| iOS | Provisioning profiles | Apple Developer Portal + EAS managed sync | Mobile lead, Release engineer | Regenerate from portal; no local-only copies required |
| Android | Upload keystore (.jks) / Play App Signing upload key | EAS credentials or CI secret store (encrypted) + org vault | Mobile lead, Release engineer, Security approver | If Play App Signing enabled, Google holds app signing key; upload key can be reset via Play Console |
| CI | `EXPO_TOKEN`, Apple/Google service credentials | GitHub Actions Secrets (environment-scoped) | Repo admins / release maintainers | Rotate on personnel change or suspected leak |

**Rules:** no signing keys in git, no plaintext in chat/tickets, no sharing via unencrypted channels. Access is least-privilege and reviewed.

## iOS: certificates & provisioning
1. **Preferred (EAS managed):** `eas credentials` / EAS dashboard lets Expo generate/store distribution certs and profiles. Limit who can run credential mutations.
2. **Manual:** create cert in Apple Developer, export .p12 with strong password, store in vault; create App Store provisioning profile bound to bundle id; upload to CI/EAS as needed.
3. **TestFlight flow:** build signed IPA (EAS build production/profile per release), upload via EAS submit or Transporter/Fastlane with App Store Connect API key, add to internal/external testing groups, ensure compliance/export and privacy answers are current.
4. **Release:** promote tested build to App Review / phased release per policy.

## Android: keystore & Play App Signing
1. **Play App Signing (recommended):** enroll app; Google manages app signing key. Maintain upload key securely.
2. **Keystore handling:** generate with strong passwords, store in vault + CI secrets; record alias/fingerprint in release notes (not private material).
3. **Tracks:** internal -> closed -> open testing -> production; use staged rollout where appropriate.
4. **Upload key reset:** if compromised/lost and Play App Signing enabled, request upload key reset in Play Console following Google verification.

## Rotation and revocation
- **Schedule:** rotate CI tokens/service keys annually or on owner change; review cert/profile expiry monthly.
- **iOS revocation:** revoke compromised cert in Apple Developer Portal, regenerate, update EAS/CI, invalidate affected builds; communicate to team.
- **Android:** if upload key compromised, reset via Play Console; if legacy self-signing key compromised, follow Play guidance (high impact).
- **After rotation:** verify a tagged release build succeeds on CI and installs on test devices.

## Emergency checklist (lost/leaked key or account compromise)
1. Revoke/disable leaked credential immediately (Apple cert, API key, upload key access, CI secret).
2. Rotate GitHub/EAS/Apple/Google tokens and audit recent access logs.
3. Rebuild and resubmit from clean environment with new credentials.
4. Assess whether malicious builds could have been distributed; coordinate with store support if needed.
5. Document incident, root cause, and follow-up actions.

## Release steps (summary)
- Tag release commit -> CI builds signed artifacts (see EAS/CI workflow when configured) -> publish to TestFlight/internal track -> QA signoff -> promote to production -> monitor crash/health metrics.
- Ensure environment config points to correct stage API and secrets are environment-scoped.

## References
- `docs/auth-secret-rotation.md` (API secrets) — mobile signing is separate but follows same least-privilege/rotation principles.
- Expo/EAS credentials & build docs; Apple App Store Connect/TestFlight; Google Play App Signing.
