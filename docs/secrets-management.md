# Secrets Management Approach

This document outlines the strategy for managing secrets across all environments in LumenHealth.

## Local Development

- Use `.env` files at the project root for local configuration.
- **Never commit `.env` files or any secrets to version control.** Ensure `.env` is listed in `.gitignore`.
- Use `.env.example` (with placeholder values only) as a template for required variables.
- Developers should obtain real values from a secure shared vault or a designated team lead.

## CI/CD (GitHub Actions)

- All secrets used in workflows must be stored as **GitHub Actions Secrets** (Settings → Secrets and variables → Actions).
- Use **environment-scoped secrets** for staging and production environments to limit exposure:
  - `staging` environment: staging-specific API keys, DB credentials.
  - `production` environment: production-only tokens and credentials.
- Reference secrets in workflows via `${{ secrets.SECRET_NAME }}` — never hardcode them.
- Restrict which branches can deploy to each environment using GitHub environment protection rules.

## Production

- Use a dedicated **secrets manager** for runtime secret injection:
  - **HashiCorp Vault** (self-hosted) or **AWS Secrets Manager** (cloud-managed) are the recommended options.
  - Applications retrieve secrets at startup via the secrets manager SDK/API, not from environment files.
- Secrets should never be logged, printed, or exposed in error messages.
- Apply the principle of least privilege: each service accesses only the secrets it needs.

## Secret Rotation Policy

| Secret Type          | Rotation Frequency |
|----------------------|--------------------|
| API keys (third-party) | Every 90 days     |
| Database credentials | Every 60 days      |
| JWT signing secrets  | Every 30 days      |
| Service account tokens | On team member offboarding or immediately if compromised |

- Rotation must be performed without downtime using dual-active secret windows where possible.
- After rotation, old secrets must be revoked within 24 hours.

## Audit Logging for Secret Access

- All reads and writes to secrets in the secrets manager must be logged.
- Log entries must capture: timestamp, secret name (not value), requesting service/user, and source IP.
- Audit logs must be retained for a minimum of 12 months.
- Alerts must be configured for anomalous access patterns (e.g., high-frequency reads, access from unexpected IPs).
