# Maintainer Triage Guide

Use this guide when reviewing new issues or contributor proposals.

## Redirect to ADR or RFC first when

- the issue changes workspace boundaries
- the issue introduces or breaks a shared package export
- the issue changes a public API contract in a compatibility-sensitive way
- the issue affects privacy, tenancy, retention, or audit guarantees across modules

## Issue Quality Gate

Before labeling an issue as contributor-ready, verify that it includes:

- a bounded problem statement
- affected modules or routes
- privacy and compliance notes
- testing expectations
- migration or rollout notes when contracts or schemas change

## Template Selection

- use `Backend Module Work` for API, service, and domain tasks
- use `Frontend Workflow Work` for web or mobile interaction flows
- use `Security or Compliance Change` for auth, privacy, encryption, and audit work
- use `Data Model Change` for schemas, indexes, and retention-sensitive persistence work
