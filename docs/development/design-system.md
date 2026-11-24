# Design system (`packages/ui`)

The "Lumen Instrument" identity is defined in tokens (`packages/ui/src/styles/theme.css`) and delivered
as React components. Pages compose these; they do not hand-roll controls. A live showcase of the real
components is at **`/design-system`** (signed in). Decision record: [ADR 0009](../adr/0009-lumen-instrument-and-design-system.md).

## Tokens

- **Colour:** `stone-*` canvas and neutrals, `ink-*` text, `rule`/`rule-strong` hairlines, `green-*`
  (evergreen rail, selection, focus), `lime-*` (chartreuse accent), plus `danger`, `warning`, `success`
  scales. `@theme static` emits every token so any can be used by utility class.
- **Chartreuse rule:** fill with dark text only (primary button, current-item marker, selection). Never as
  text or a thin line. On evergreen surfaces (`.on-dark`) the focus ring turns lime.
- **Type:** `.display` (Fraunces) for page titles and key figures; body is Instrument Sans; `.data`
  (Geist Mono, tabular figures) only for identifiers (MRN, queue number), measurements and timestamps.
  Fonts are npm packages (`@fontsource-variable/*`), bundled by Vite.
- **Shape:** 2-8 px radii (mostly 5-6 px), hairline borders, shadows only on floating layers (menus, dialogs, toasts).

## Components

| Group      | Components                                                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Actions    | `Button` (primary, secondary, quiet, destructive, destructive-quiet; `loading`; sizes), `IconButton` (requires `label`)                         |
| Fields     | `FormField`, `TextField`, `TextArea`, `Select`, `SearchField`, `Combobox`, `Checkbox`, `CheckboxField`, `RadioGroup`/`RadioItem`, `FormSection` |
| Overlays   | `Dialog`, `ConfirmDialog`, `Drawer`, `DropdownMenu`, `Popover`, `Tooltip` (Radix: focus trap, Esc, return focus)                                |
| Navigation | `Tabs`, `Breadcrumbs`                                                                                                                           |
| Feedback   | `Skeleton`, `Spinner`, `Toaster` (sonner), `EmptyState`, `ErrorState` (with retry), `Alert`                                                     |
| Structure  | `PageHeader`, `SectionHeader`, `Panel`, `RecordSection`, `DefinitionList`                                                                       |
| Status     | `StatusIndicator` (dot + word), `Tag`, `Avatar`, `Kbd`                                                                                          |
| Data       | `DataTable`, `Pagination`, `TableToolbar`, `FilterBar`, `FilterSelect`                                                                          |

### DataTable

```tsx
<DataTable
  caption="Patients"
  columns={columns}            // Column<T>[]: header, cell, sortKey?, showFrom?, mobile?: 'title' | 'meta' | 'hidden'
  rows={data?.items}
  rowKey={(p) => p.id}
  sort={{ key: 'mrn', order: 'desc' }}
  onSortChange={(s) => setState(s)}
  onRowClick={(p) => navigate(`/patients/${p.id}`)}
  rowActions={(p) => <RowMenu patient={p} />}   // clicks here do not trigger onRowClick
  loading={isLoading}          // skeleton rows, layout-stable
  refreshing={isFetching}      // previous rows stay, dimmed
  error={isError ? { title, message, onRetry } : null}
  empty={<EmptyState title="No patients match" action={...} />}
  toolbar={<TableToolbar>...</TableToolbar>}
  pagination={{ page, pageSize, total, totalPages, onPageChange, onPageSizeChange, itemLabel: 'patients' }}
/>
```

- Sortable headers are buttons with `aria-sort`; clicking toggles direction (first direction per column is configurable).
- At `md` and wider it is a real `<table>`; below `md` the same rows render as a record list (a `title`
  line plus labelled `meta` values) with a sort select, so nothing is squeezed or scrolled sideways.
- Pagination shows "21-30 of 331 patients", first/previous/next/last, a page window with ellipses, and an
  optional page-size select. Buttons disable at the ends.

### Table state in the URL (`apps/web/src/lib/table-state.ts`)

`useTableState({ sorts, defaultSort, filters, pageSizes })` reads and writes `page`, `pageSize`, `q`,
`sort`, `order` and named filters from the query string. Unknown or invalid values fall back to defaults
and never reach the API; changing search, filter, sort or page size resets to page 1. `useSearchInput`
debounces the search box without setState-in-effect. Out-of-range pages are clamped to the last page.

## Craft details (session 4)

- **`TextArea variant="document"`:** for long clinical writing. No box: a hairline underline that darkens on
  hover and turns evergreen on focus; grows with its text (`field-sizing: content`, with a measuring fallback).
  Pair with the `text-prose` size (16 px / 1.7) and a 40 rem measure. The default `box` variant is unchanged.
- **`DataTable`:** `Column.width` sets the width on heading and cells so columns do not move between pages;
  `quietActions` dims a repeated overflow menu (⋯) until the row is hovered or focused (never for direct actions
  such as Start or Check in); inactive sort arrows appear on hover or focus; the sorted heading is bold; the footer
  shows "Page X of Y" on phones. Long identifiers wrap (`line-clamp-2`) instead of truncating at a fixed width.
- **`SectionHeader quiet`:** supporting regions beside a primary one. A count of 0 is shown.
- **`PageHeader`:** actions share the title's row; the description sits below.
- **`Tag tone="inverse"`:** a dark label for a distinction that must not be missed (e.g. Primary diagnosis).
- **Shell:** the navigation rail is a fixed 256 px from 1024 px up; a top-level page does not repeat its title in
  the top bar (breadcrumbs appear only for nested pages).
- **Draft vs issued:** drafts use a dashed amber edge and a hollow marker; issued items a plain row and a solid marker.

## Rules for new UI

1. Use a component before writing markup; add a component (with a test) when a pattern appears twice.
2. Controls have visible labels; icon-only controls have an accessible name; errors are text, not colour.
3. Touch targets are 44 px on coarse pointers (`pointer-coarse:`).
4. Every list has loading, empty, error and (where relevant) no-results states.
5. Check it on the real screen at 1440x900, 1280x800 and 390x844 (`pnpm --filter @lumen/web shots`).

## Tests

`pnpm --filter @lumen/ui test` (Vitest + Testing Library + jsdom): buttons, fields, overlays, the page
window, sort toggling, skeleton count, empty/error/retry, row click vs. row action, record list, pagination
states. Browser-level: `apps/web/e2e/registry.spec.ts` and `accessibility.spec.ts`.
