# ADR 0010: List pagination, sorting and search contract

**Status:** accepted · **Date:** 2026-10-23

## Decision

All list endpoints that can grow accept `page` (>=1), `pageSize` (1-100, default 25), a per-endpoint
whitelisted `sort` and `order`, and their search/filters. They return the flat shape
`{ items, total, page, pageSize, totalPages, hasNextPage, hasPreviousPage }`.

- Invalid input is rejected with `VALIDATION_FAILED`; sort keys map to fixed columns, never raw SQL.
- Search and filters are applied before counting and paging; `total` is the filtered count.
- Ordering is deterministic: the requested column, then `id`.
- A page beyond the last returns no items and correct metadata; clients clamp to the last page.
- Every query is organisation-scoped (and branch-scoped where applicable); RLS still applies.
- The earlier `{items,total,page,pageSize}` shape was extended, not wrapped in `{data,pagination}`, so
  existing consumers keep working.
- Table state is held in URL query parameters on the web side.
- Substring search uses `ILIKE` backed by `pg_trgm` GIN indexes.

## Consequences

Offset pagination can drift when rows are inserted between requests and gets slower at very large offsets;
the tests assert no duplicates within a stable data set and tolerance to inserts. Move to keyset pagination
if a table outgrows this.
