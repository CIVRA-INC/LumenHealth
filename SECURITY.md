# Security Policy

LumenHealth handles authentication, clinic data isolation, audit-log integrity and Stellar signing
keys, so please report vulnerabilities privately.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting: open the repository's **Security** tab and choose
**Report a vulnerability**
(https://github.com/CIVRA-INC/LumenHealth/security/advisories/new). Do not open a public issue,
discussion or pull request for a suspected vulnerability.

Include the affected component and version or commit, reproduction steps, the impact you expect,
and any proof of concept.

## What to expect

- Acknowledgement within 3 business days.
- An initial assessment (severity and whether we can reproduce it) within 10 business days.
- A fix or mitigation plan for confirmed issues, with a target based on severity; we will keep you
  updated and credit you in the advisory unless you prefer otherwise.

## Supported versions

The repository has no tagged releases yet; security fixes are made on `develop` and promoted to
`main`. Once releases exist, this table will list the supported lines.

| Version | Supported |
|---|---|
| `main` / `develop` | Yes |

## Scope

In scope: `apps/api`, `apps/web`, `apps/mobile`, `apps/stellar-service`, `packages/*` and the
GitHub workflows. Out of scope: findings that need physical access, social engineering, denial of
service by volume, and third-party services we do not run.

## Safe harbour

We will not pursue legal action against researchers who make a good-faith effort to follow this
policy: test only against your own accounts or a local deployment, do not access or modify other
people's data, do not exfiltrate real patient or clinic data, and give us reasonable time to fix
an issue before disclosing it.

Related documents: `docs/auth-threat-model.md`, `docs/stellar-key-rotation.md`.
