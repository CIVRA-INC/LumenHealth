# LumenHealth 🩺✨

**LumenHealth** is a lightweight, AI-assisted electronic medical record (EMR) system built for clinics, mobile health teams, and care providers operating in resource-constrained or low-connectivity environments. It prioritizes speed, clarity, and reliability over bloated hospital software, making it suitable for frontline healthcare delivery in underserved communities.

At its core, LumenHealth combines **AI-powered clinical intelligence** with **secure, blockchain-based payments** to support both care delivery and sustainability. Clinicians can capture patient encounters quickly, receive smart summaries and decision support, and accept fast digital payments, all within a system designed to work even when infrastructure is limited.

---

## What Makes LumenHealth Different

* **AI-assisted clinical workflows:** Uses Google Gemini to generate visit summaries, assist documentation, and surface key clinical insights without replacing clinician judgment.
* **Offline-friendly by design:** Built to function in environments with unstable or intermittent connectivity.
* **Lightweight EMR, not a hospital ERP:** Focused on essential patient records and encounters, not administrative overload.
* **Crypto-native payments:** Enables fast, low-cost payments via the Stellar network, supporting clinics without access to traditional banking.
* **Open-source & extensible:** Designed to be adapted for NGOs, startups, and public health pilots.

---

## Technology Overview

* **Frontend:** React / React Native (clinic and mobile workflows)
* **Backend:** Node.js + Express.js
* **AI Layer:** Google Gemini (clinical summaries & assistance)
* **Payments:** Stellar Network
* **Database:** MongoDB
* **Auth:** JWT-based authentication

---

## Repository Structure

The project is organized around **clinical workflows**, not just technical layers.

```
lumen-health/
├── src/
│   ├── config/              # Env, database, AI & Stellar config
│   ├── modules/
│   │   ├── auth/            # Users, roles, sessions
│   │   ├── patients/        # Patient records & demographics
│   │   ├── encounters/      # Visits, notes, vitals
│   │   ├── ai/              # Gemini prompts & summaries
│   │   ├── payments/        # Stellar-based payments
│   │   └── clinics/         # Clinic profiles & settings
│   ├── middlewares/         # Security, validation, errors
│   ├── routes/              # API routing
│   └── app.ts               # App bootstrap
├── tests/
├── .env.example
├── package.json
└── README.md
```

Each module owns its business logic, routes, and models to keep the system maintainable and contributor-friendly.

---

## API Design (High-Level)

### Base Path

```
/api/v1
```

### Patients

```
POST   /patients
GET    /patients/:id
PATCH  /patients/:id
```

### Clinical Encounters

```
POST   /encounters
GET    /encounters/:id
GET    /encounters/patient/:patientId
```

### AI Assistance

```
POST   /ai/summarize
POST   /ai/clinical-notes
```

### Payments (Stellar)

```
POST   /payments/intent
POST   /payments/confirm
GET    /payments/:id
```

---

## Getting Started

### Requirements

* Node.js (>= 18)
* MongoDB
* Google Gemini API key
* Stellar testnet account

### Setup

```bash
git clone https://github.com/your-org/lumen-health.git
cd lumen-health
npm install
cp .env.example .env
```

### Run Locally

```bash
npm run dev
```

### Tests

```bash
npm test
```

---

## Contributing

LumenHealth is an open-source project aimed at improving healthcare access and tooling. Contributions are welcome from engineers, designers, and healthcare technologists.

### Contribution Workflow

1. Fork the repository
2. Create a feature or fix branch
3. Keep PRs scoped to a single concern
4. Add tests or documentation where relevant
5. Open a Pull Request with context and screenshots if applicable

### Guidelines

* Respect patient data principles, even in mock data
* Avoid introducing heavy dependencies
* Prefer clarity and reliability over clever abstractions
* Discuss large changes before implementation

---

## Community & Support

For questions, discussions, or contributor support, join the LumenHealth Telegram group:

👉 **Telegram:** [LumenHealth](https://t.me/+gRA3CdyekZw3MWM0)

---

## License

LumenHealth is released under the **MIT License**.




