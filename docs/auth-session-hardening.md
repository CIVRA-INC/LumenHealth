# Auth Session Hardening (Batch-1)

This slice adds a lightweight baseline for:
- refresh-token storage and revocation
- suspicious refresh reuse detection signal
- simple per-endpoint rate limiting for login/refresh/recovery surfaces

Notes:
- Session persistence remains in-memory for MVP starter speed.
- Replay of a previously seen refresh token is logged as suspicious.
- Limits are intentionally conservative and can be tuned in future milestones.
