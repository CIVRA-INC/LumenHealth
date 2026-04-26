# Incident Severity Matrix and Runbook Template

## Severity Matrix

| Severity | Definition                                      | Initial Response Time | Update Cadence  | Escalation         |
|----------|-------------------------------------------------|-----------------------|-----------------|--------------------|
| **P0**   | Total outage — service completely unavailable   | 5 minutes             | Every 15 min    | CTO + on-call lead |
| **P1**   | Major feature down — core functionality broken  | 15 minutes            | Every 30 min    | Engineering lead   |
| **P2**   | Degraded performance — partial impact           | 30 minutes            | Every 60 min    | On-call engineer   |
| **P3**   | Minor issue — low impact or cosmetic            | Next business day     | As needed       | Assigned engineer  |

---

## Runbook Template

> Copy this template and fill in each section when an incident is declared.

### Incident Title
<!-- Short description, e.g. "P1 – Auth service returning 500s" -->

### Severity
<!-- P0 / P1 / P2 / P3 -->

### Incident Commander
<!-- Name of the person coordinating the response -->

### Date & Time Declared
<!-- ISO 8601 timestamp, e.g. 2026-04-26T14:32:00Z -->

---

### 1. Detection

- **How was the incident detected?**
  <!-- Alert fired / user report / monitoring dashboard -->
- **First observed at:**
- **Affected systems / services:**

---

### 2. Impact Assessment

- **Who is affected?** (e.g., all users, a specific region, a subset of accounts)
- **Estimated number of users impacted:**
- **Business impact:** (revenue, data integrity, compliance risk)
- **Is data loss or security breach involved?** Yes / No

---

### 3. Mitigation

- **Immediate actions taken:**
  1.
  2.
- **Workaround available?** Yes / No — describe if yes.
- **Time to mitigation (TTM):**

---

### 4. Communication

- **Internal stakeholders notified:**
  - [ ] Engineering lead
  - [ ] Product manager
  - [ ] CTO (P0/P1 only)
- **External communication issued?** Yes / No
  - Channel: (Status page / email / in-app banner)
  - Message:
- **Communication timestamps:**

---

### 5. Post-Mortem

> Complete within 48 hours of incident resolution for P0/P1; within 1 week for P2.

- **Root Cause:**
- **Contributing Factors:**
- **Timeline of events:**
- **What went well:**
- **What went wrong:**
- **Action items:**

| Action Item | Owner | Due Date |
|-------------|-------|----------|
|             |       |          |

- **Incident resolved at:**
- **Total time to resolution (TTR):**
