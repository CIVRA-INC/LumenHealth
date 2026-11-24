# ADR 0009: "Lumen Instrument" identity and the `packages/ui` design system

**Status:** accepted · **Date:** 2026-10-23 · **Supersedes:** the session-2 "chart" identity (D15)

## Decision

The interface uses one bespoke identity and one component library.

- **Palette:** warm-stone canvas, white surfaces with thin rules, deep evergreen navigation, chartreuse as a
  _fill with dark text_ for the primary action and current selection. Chartreuse is never used for text or
  thin lines (contrast). Status colours are paired with a word, never colour alone.
- **Type:** Fraunces for page titles, Instrument Sans for reading, Geist Mono only for identifiers,
  measurements and timestamps. Bundled via `@fontsource-variable/*` (no CDN, reproducible builds).
- **Signature:** the day ruler on Today, built from real appointments and the current time.
- **System:** every screen composes components from `packages/ui` (tokens in `theme.css`, Radix for
  behaviour, `cva` for variants). Pages do not hand-roll buttons, fields, dialogs or tables. The showcase
  at `/design-system` renders the real components.

## Consequences

Visual change is made in tokens and components, not per page. Components carry tests (`packages/ui`) and
are scanned by axe in e2e. Dark theme and density options are future, additive token work.
