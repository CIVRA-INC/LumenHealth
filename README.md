# LumenHealth 

**LumenHealth** is a lightweight, AI-assisted electronic medical record (EMR) system built for clinics, mobile health teams, and care providers operating in resource-constrained or low-connectivity environments. It prioritizes speed, clarity, and reliability over bloated hospital software.

At its core, LumenHealth combines **AI-powered clinical intelligence** with **secure, blockchain-based payments** to support both care delivery and sustainability.


---

## What Makes LumenHealth Different

* **AI-assisted clinical workflows:** Uses Google Gemini to generate visit summaries, assist documentation, and surface key clinical insights without replacing clinician judgment.
* **Offline-friendly by design:** Built to function in environments with unstable or intermittent connectivity.
* **Lightweight EMR, not a hospital ERP:** Focused on essential patient records and encounters, not administrative overload.
* **Crypto-native payments:** Enables fast, low-cost payments via the Stellar network, supporting clinics without access to traditional banking.
* **Open-source & extensible:** Designed to be adapted for NGOs, startups, and public health pilots.

---

## Architecture & Tech Stack

LumenHealth is a **Monorepo** managed by [Turborepo](https://turbo.build/) and NPM Workspaces. This allows us to share configuration, types, and logic between the frontend, backend, and blockchain services.

| Layer | Technology | Description |
| --- | --- | --- |
| **Monorepo Tooling** | Turborepo / NPM | Orchestration and workspace management |
| **Frontend** | Next.js (React) | Clinic dashboard and patient management UI |
| **Backend** | Node.js + Express | REST API using a **Modular Monolith** architecture |
| **Blockchain** | Stellar SDK | Payment processing and access control service |
| **Database** | MongoDB | Off-chain storage for patient data and logs |
| **AI Layer** | Google Gemini | Clinical summarization and intelligence |

---

## Repository Structure

The project is divided into **Apps** (deployable services) and **Packages** (shared libraries).

```text
lumen-health/
├── apps/
│   ├── api/                 # Express Backend (The Core Logic)
│   │   ├── src/modules/     # Domain-driven modules (Patients, Encounters, etc.)
│   │   └── src/app.ts       # API Entry point
│   ├── web/                 # Next.js Frontend Application
│   └── stellar-service/     # Isolated service for Blockchain interactions
├── packages/
│   ├── config/              # Shared Environment variables & Configuration
│   └── types/               # (Future) Shared TypeScript interfaces
├── .env                     # Root "Source of Truth" for Environment Variables
├── turbo.json               # Build pipeline configuration
└── package.json             # Root workspace definition

```

## Workspace Boundaries

LumenHealth keeps runtime responsibilities explicit so contributors can work in parallel safely:

- `apps/api`: backend domain modules and REST interfaces only
- `apps/web`: Next.js operator experience only
- `apps/stellar-service`: Stellar network operations and diagnostics only
- `packages/config`: shared runtime configuration, feature flags, and platform guardrails
- `packages/types`: shared schemas and cross-app TypeScript contracts

Allowed shared imports are intentionally narrow:

- app workspaces may import `@lumen/config` and `@lumen/types`
- shared packages must not import app workspaces
- cross-workspace root-relative imports are rejected by `npm run check:boundaries`

Use the boundary checker before merging architecture-sensitive work:

```bash
npm run check:boundaries
npm run check:boundaries:fixtures
npm run check:architecture
```

## Shared Contract Versioning

Shared packages and public API contracts must follow the policy in [CONTRACT_VERSIONING.md](./CONTRACT_VERSIONING.md).

- use additive changes where possible
- document compatibility-sensitive or breaking changes in [CONTRACT_CHANGELOG_TEMPLATE.md](./CONTRACT_CHANGELOG_TEMPLATE.md)
- complete the contract section in the pull request template for shared package or API changes

## Contributor Intake

Architecture-sensitive issue intake now uses GitHub issue templates under `.github/ISSUE_TEMPLATE/`.

- backend module work
- frontend workflow work
- security or compliance change
- data model change

Maintainers should use [.github/MAINTAINER_TRIAGE.md](./.github/MAINTAINER_TRIAGE.md) to decide when to redirect work into an ADR or RFC.

For a maintainer-oriented overview of runtime seams and preferred extension patterns, see [docs/contributor-architecture-handbook.md](./docs/contributor-architecture-handbook.md).

## Architecture Standards

| Document | Description |
| --- | --- |
| [docs/backend-module-template.md](./docs/backend-module-template.md) | Standard layout, naming, and implementation boundaries for Express domain modules |
| [docs/domain-glossary.md](./docs/domain-glossary.md) | Canonical terminology for all domain entities across product, engineering, and blockchain |
| [docs/data-ownership-boundaries.md](./docs/data-ownership-boundaries.md) | Source-of-truth assignments for MongoDB, Stellar, and future Redis |
| [docs/non-functional-requirements.md](./docs/non-functional-requirements.md) | Latency budgets, uptime targets, transaction reliability, and data retention rules |

## Current MVP Surface

The repository already contains:

- Clinic registration and authentication
- Staff management
- Patient registration, search, and timeline
- Encounter create, claim, and close flows
- Queue board with live updates
- Vitals, notes, diagnoses, and audit views
- Stellar billing intent generation and payment polling
- AI streaming and CDS worker scaffolding

## Main Web Routes

- `/login`
- `/register`
- `/dashboard`
- `/dashboard/queue`
- `/dashboard/encounters`
- `/dashboard/patients`
- `/dashboard/notes`
- `/dashboard/vitals`
- `/dashboard/diagnoses`
- `/dashboard/audit`
- `/dashboard/billing`

## Main API Areas

- `/api/v1/auth`
- `/api/v1/clinics`
- `/api/v1/users`
- `/api/v1/patients`
- `/api/v1/encounters`
- `/api/v1/queue`
- `/api/v1/vitals`
- `/api/v1/notes`
- `/api/v1/diagnoses/search`
- `/api/v1/audit-logs`
- `/api/v1/payments`
- `/api/v1/ai`

### Backend Internal Structure (`apps/api`)

The API follows a **Modular Monolith** pattern. Code is organized by domain, not just technical layer.

* `modules/auth`: Users, roles, sessions (JWT)
* `modules/patients`: Patient demographics & lookup
* `modules/encounters`: The core append-only medical history
* `modules/payments`: Subscription & Stellar payment logic
* `modules/ai`: Gemini prompt management

---

## API Design (High-Level)

**Base URL:** `http://localhost:4000/api/v1`

### Patients

* `POST /patients` - Create new record
* `GET /patients/:id` - Retrieve patient details

### Clinical Encounters

* `POST /encounters` - Log a new visit
* `GET /encounters/:id` - View visit details
* `GET /encounters/patient/:patientId` - Full history

### Payments (Stellar)

* `POST /payments/intent` - Generate payment request
* `POST /payments/confirm` - Verify on-chain transaction

---

## Getting Started

### Prerequisites

* **Node.js** (v18 or higher)
* **npm** (v10+ recommended)
* **MongoDB** (Local or Atlas URL)
* **Google Gemini API Key**
* **Stellar Testnet Account**

### Installation

1. **Clone the Monorepo**
```bash
git clone https://github.com/your-org/lumen-health.git
cd lumen-health

```


2. **Install Dependencies (Root)**
This installs dependencies for *all* apps and packages at once.
```bash
npm install

```


3. **Environment Setup**
Create a **single** `.env` file in the **root** directory. The `packages/config` module will distribute these variables to all apps.
```bash
cp .env.example .env

```


**Example `.env`:**
```env
API_PORT=4000
MONGO_URI=mongodb://localhost:27017/lumenhealth
JWT_ACCESS_TOKEN_SECRET=replace_me
JWT_REFRESH_TOKEN_SECRET=replace_me_too
STELLAR_NETWORK=testnet
GEMINI_API_KEY=your_key_here

```



### Running Locally

To start **Frontend**, **Backend**, and **Services** simultaneously:

```bash
npm run dev

```

### Bootstrap Checks

Before first run, validate local prerequisites and optional integrations:

```bash
npm run setup
```

To run the same bootstrap flow and seed the demo clinic in one pass:

```bash
npm run setup:seed-demo
```

Bootstrap validates:

- Node.js and npm availability
- root `.env` presence
- required API secrets
- optional Gemini and Stellar secrets
- basic MongoDB host reachability when the URI is directly parseable

* **Frontend:** [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000)
* **Backend:** [http://localhost:4000](https://www.google.com/search?q=http://localhost:4000)

### Running Individual Workspaces

If you only want to work on one part of the system:

```bash
npm run dev -w apps/api       # Run only Backend
npm run dev -w apps/web       # Run only Frontend

```

### Seeding Demo Data

To seed a small demo clinic, admin account, patients, and open encounters:

```bash
MONGO_URI=mongodb://localhost:27017/lumenhealth npm run seed:demo -w apps/api
```

---

[UI design](https://www.figma.com/design/zKvGSIUGADZgYe1aKyJuUg/Qyou?node-id=0-1&t=O7feQUlPDaDLVIcK-1)

## Contributing

LumenHealth is open-source. We welcome contributions from engineers, designers, and healthcare technologists.

### Workflow

1. **Fork** the repository.
2. **Create a branch** for your feature (`git checkout -b feature/amazing-feature`).
3. **Commit** your changes.
4. **Push** to the branch.
5. **Open a Pull Request**.

### Guidelines

* **Respect the Monorepo:** Ensure you are installing dependencies via the root `package.json` or using `npm install <pkg> -w apps/<app-name>`.
* **Strict Types:** We use TypeScript. Please avoid `any` wherever possible.
* **Patient Privacy:** Never include real patient data in tests or screenshots.

---

## Community & Support

For questions, discussions, or contributor support, join the LumenHealth Telegram group:

👉 **Telegram:** [LumenHealth](https://t.me/+gRA3CdyekZw3MWM0)



## License

LumenHealth is released under the **MIT License**.
