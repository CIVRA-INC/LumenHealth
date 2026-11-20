# ADR 0002: Choose Expo Managed Workflow Versus Bare React Native (mxllv)

- Status: Proposed
- Date: 2026-11-20
- Issue: #1520 [RB-064]

## Context
LumenHealth mobile needs fast iteration, reliable OTA updates, consistent native builds (EAS), and access to device capabilities (biometrics, secure storage, camera, background tasks) while keeping maintenance and PHI-handling risks low.

## Options Considered
1. **Expo managed workflow (with EAS Build/Update, config plugins/dev client as needed)**
2. **Bare React Native (fully native ios/android projects owned in-repo)**

## Decision
Adopt **Expo managed workflow** as the default for `apps/mobile`, using the Expo dev client and config plugins when modules require native configuration. Re-evaluate bare only for blockers that cannot be solved via supported Expo modules/plugins.

## Rationale
- **Delivery speed & consistency:** unified JS/native toolchain, EAS profiles, simpler onboarding.
- **Maintenance:** less custom native drift; upgrades guided by Expo SDK releases.
- **Capabilities:** required features (auth storage, biometrics, push, camera) available via maintained modules/plugins.
- **Risk:** managed constraints reduce accidental insecure native changes; bare increases audit/review surface.

## Consequences
- Positive: faster CI builds, predictable environments, easier OTA for non-native JS changes.
- Negative: occasional lag for newest native APIs; some modules need config plugins/dev builds.
- Mitigations: track SDK upgrade cadence, validate plugins for PHI-sensitive modules, document any approved native exceptions.

## Follow-up
- Standardize EAS profiles per stage (#1537/#1536).
- Document release/signing runbook (#1538).
- Revisit if a required native capability is unsupported or security posture demands custom native code.
