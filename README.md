# LumenHealth

**LumenHealth** is a clinical operations platform designed to help healthcare facilities manage patients, staff workflows, encounters, and billing in a unified system.

The platform combines web, mobile, and backend services with a dedicated Stellar integration layer for financial and billing workflows, enabling a modern healthcare system that is structured, auditable, and scalable.

LumenHealth is built as a monorepo to support fast iteration across clinical, administrative, and operational features.

---

## Overview

Healthcare systems often operate across fragmented tools — patient records in one system, scheduling in another, billing handled separately, and mobile workflows poorly integrated.

LumenHealth addresses this by providing a unified platform for:

* clinic and staff management,
* patient records and histories,
* clinical encounters and workflows,
* billing and payment processing,
* mobile-first access for healthcare workers,
* structured, auditable data across all operations.

The system is designed to support both administrative and frontline clinical use cases.

---

## Core Modules

## Authentication & Access Control

LumenHealth begins with a secure authentication and role system.

It supports:

* staff login and identity verification,
* role-based access (admin, clinician, support staff),
* secure session management,
* scoped permissions per clinic or organization.

This forms the foundation for all clinical and administrative actions.

---

## Clinic & Staff Management

The platform supports structured clinic organization management.

Capabilities include:

* clinic onboarding,
* staff assignment and roles,
* multi-clinic support,
* access scoping per facility,
* administrative oversight tools.

This ensures healthcare environments can be modeled accurately within the system.

---

## Patient Records

Patient data is central to LumenHealth.

The system provides:

* patient profiles,
* medical history tracking,
* visit records,
* structured clinical data storage,
* longitudinal patient context,
* secure access controls.

All patient data is designed to be consistent, traceable, and easy to extend.

---

## Encounters & Clinical Workflows

Encounters represent interactions between clinicians and patients.

The system supports:

* visit creation and updates,
* diagnosis and notes,
* treatment workflows,
* structured encounter timelines,
* follow-up tracking,
* clinician collaboration.

This creates a clear record of clinical activity over time.

---

## Billing & Stellar Integration

LumenHealth uses Stellar to support financial workflows within healthcare operations.

The Stellar service enables:

* billing event processing,
* payment tracking,
* transaction receipts,
* audit-friendly financial records,
* integration between clinical actions and billing events.

This provides a transparent and programmable layer for healthcare billing workflows.

---

## Mobile & Offline Support

The mobile workspace is designed for frontline healthcare environments.

It supports:

* patient lookup and access,
* encounter documentation,
* offline-first workflows (future phase),
* sync when connectivity is restored,
* lightweight clinical data entry.

This ensures clinicians can operate even in low-connectivity environments.

---

## System Architecture

LumenHealth is built as a strict monorepo with clear boundaries between services.

| Layer              | Technology             |
| ------------------ | ---------------------- |
| API                | Express + TypeScript   |
| Web                | Next.js App Router     |
| Mobile             | React Native workspace |
| Blockchain/Billing | Stellar service        |
| Shared Config      | @lumen/config          |
| Shared Types       | @lumen/types           |

---

## Repository Structure

```text id="lm8x2k"
lumenhealth/
│
├── apps/
│   ├── api/                # Core backend services
│   ├── web/                # Admin + clinic web app
│   ├── mobile/             # Clinical mobile workspace
│   └── stellar-service/    # Billing + Stellar integration
│
├── packages/
│   ├── config/             # Shared runtime rules
│   └── types/              # Shared domain contracts
│
└── docs/
```

---

## MVP Delivery Plan

The platform is being rebuilt in structured clinical milestones:

1. Authentication and access control
2. Clinic and staff management
3. Patient records system
4. Clinical encounter workflows
5. Billing and Stellar integration layer
6. Mobile clinical workflows and offline readiness
7. Production hardening and auditability

Each milestone builds directly on the previous one to ensure safe clinical progression.

---

## Getting Started

### Requirements

* Node.js 20+
* npm 10+

---

### Installation

```bash id="v9k1sd"
npm install
```

---

### Run development environment

```bash id="q2m0lx"
npm run dev
```

---

### Architecture validation

Before contributing:

```bash id="p3z7aa"
npm run check:architecture
npm run check:boundaries
```

---

## Environment Setup

Create a root `.env` from the provided template before running services locally.

Each workspace may also define:

```text id="envlm1"
apps/api/.env.example
apps/web/.env.example
apps/mobile/.env.example
apps/stellar-service/.env.example
```

---

## Documentation

* Architecture: `docs/architecture.md`
* MVP Scope: `docs/mvp-scope.md`
* Contributor Guide: `CONTRIBUTING.md`
* Reset Roadmap: `docs/reset-roadmap.md`

---

## Contribution Model

LumenHealth is structured for milestone-driven development.

To maintain clarity and safety:

* keep changes within a single milestone scope
* use shared types for cross-app data
* avoid duplicating logic across apps
* respect service boundaries (API vs Stellar vs UI)
* ensure clinical workflows remain consistent and traceable

---

## Current State

This repository is a foundational reset designed for structured MVP development.

Current scaffolding includes:

* API authentication placeholders
* Web admin shell
* Mobile workspace baseline
* Stellar service starter
* shared config and types packages
* architecture and contributor documentation

---

## Vision

LumenHealth aims to become a unified clinical operations platform that connects patients, clinicians, and healthcare administrators through structured workflows, reliable data systems, and transparent financial processing.

The long-term goal is a healthcare infrastructure layer that is modular, auditable, and adaptable across different clinical environments.

---

## License

MIT
