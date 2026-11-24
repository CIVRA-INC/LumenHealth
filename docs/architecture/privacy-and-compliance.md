# Privacy, retention and compliance notes

> Engineering notes, **not legal advice** and **not a claim of compliance or certification.** Obtain legal review in each operating jurisdiction before processing real patient data.

## Intended initial jurisdiction: Nigeria

Laws and guidance to evaluate with counsel: the **Nigeria Data Protection Act 2023** (NDPA) and the NDPC's implementing framework (health data is "sensitive personal data"), the National Health Act 2014 (confidentiality of health records), professional-body codes (MDCN), and any state-level health regulations. If cross-border processing or hosting occurs, transfer rules apply. For other markets the equivalents are HIPAA (US), GDPR (EU/UK), POPIA (South Africa), Kenya DPA.

## What the software provides toward those obligations

| Obligation (typical)                     | Support in the product                                                                                                                                    |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Access control and need-to-know          | RBAC, branch scoping, admins excluded from clinical data                                                                                                  |
| Accountability / audit of access         | Append-only audit of reads, writes, denials, sign-ins; admin viewer                                                                                       |
| Integrity of the medical record          | Immutable signed notes, addenda, entered-in-error with reasons                                                                                            |
| Data minimisation                        | Only fields needed for care; no logging of clinical content or search text                                                                                |
| Security safeguards                      | See `security-model.md`                                                                                                                                   |
| Data subject rights (access, correction) | Correction via addenda/edits with history; export tooling **not built**                                                                                   |
| Retention and deletion                   | **Not implemented.** Medical records are generally retained for years; policy to be set by the facility/law. No hard-delete paths for clinical data exist |
| Breach detection/notification            | Audit data supports investigation; alerting and procedures **not built**                                                                                  |
| Consent and lawful basis                 | **Not modelled.** To be designed with counsel (care vs. research vs. marketing)                                                                           |

## Operating requirements to decide before pilot

Data hosting location; processor agreements; retention schedule; backup retention and encryption keys custody; incident response and notification timelines; staff training; DPO appointment and registration where required; patient notices.

## Synthetic data

Everything produced by the seed is invented. Never import real patient data into development, test or e2e databases.
