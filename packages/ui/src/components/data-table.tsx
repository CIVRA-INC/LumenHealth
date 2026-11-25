import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../cn';
import { Button, IconButton } from './button';
import { EmptyState, ErrorState, Skeleton } from './feedback';
import { Select } from './fields';

// ── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** When provided, a page-size selector is shown. */
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  /** Plural noun for the summary, e.g. "patients". */
  itemLabel?: string;
}

/** Page numbers to show: always the first and last, the current page and its neighbours, with gaps as ellipses. */
export function pageWindow(page: number, totalPages: number): (number | 'gap-start' | 'gap-end')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= totalPages - 2)
    [totalPages - 3, totalPages - 2, totalPages - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | 'gap-start' | 'gap-end')[] = [];
  sorted.forEach((p, i) => {
    const previous = sorted[i - 1];
    if (previous !== undefined && p - previous > 1)
      out.push(i < sorted.length / 2 ? 'gap-start' : 'gap-end');
    out.push(p);
  });
  return out;
}

/** "26–50 of 243 patients" with page-number navigation, first/last, and an optional page-size choice. */
export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  itemLabel = 'items',
}: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const atStart = page <= 1;
  const atEnd = page >= totalPages;
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-rule bg-sunken/60 px-4 py-2.5 text-sm text-ink-600"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="data text-ink-700" aria-live="polite">
          {total === 0 ? `0 ${itemLabel}` : `${from}–${to} of ${total} ${itemLabel}`}
        </p>
        {totalPages > 1 && (
          <p className="data text-ink-500 sm:hidden">
            Page {page} of {totalPages}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {onPageSizeChange && (
          <label className="flex items-center gap-2">
            <span className="text-ink-500">Rows</span>
            <span className="w-[4.5rem]">
              <Select
                aria-label="Rows per page"
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="h-7 text-sm"
              >
                {pageSizeOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </span>
          </label>
        )}
        {totalPages > 1 && (
          <ul className="flex items-center gap-0.5">
            <li>
              <IconButton
                label="First page"
                size="sm"
                disabled={atStart}
                onClick={() => onPageChange(1)}
              >
                <ChevronsLeft />
              </IconButton>
            </li>
            <li>
              <IconButton
                label="Previous page"
                size="sm"
                disabled={atStart}
                onClick={() => onPageChange(page - 1)}
              >
                <ChevronLeft />
              </IconButton>
            </li>
            {pageWindow(page, totalPages).map((p) =>
              typeof p === 'string' ? (
                <li key={p} aria-hidden className="hidden w-6 text-center text-ink-400 sm:block">
                  …
                </li>
              ) : (
                <li key={p} className={cn(p !== page && 'hidden sm:block')}>
                  <button
                    type="button"
                    aria-label={`Page ${p}`}
                    aria-current={p === page ? 'page' : undefined}
                    onClick={() => onPageChange(p)}
                    className={cn(
                      'data h-7 min-w-7 rounded-md px-1.5 text-sm transition-colors',
                      p === page
                        ? 'bg-green-800 font-medium text-white'
                        : 'text-ink-700 hover:bg-ink-950/5',
                    )}
                  >
                    {p}
                  </button>
                </li>
              ),
            )}
            <li>
              <IconButton
                label="Next page"
                size="sm"
                disabled={atEnd}
                onClick={() => onPageChange(page + 1)}
              >
                <ChevronRight />
              </IconButton>
            </li>
            <li>
              <IconButton
                label="Last page"
                size="sm"
                disabled={atEnd}
                onClick={() => onPageChange(totalPages)}
              >
                <ChevronsRight />
              </IconButton>
            </li>
          </ul>
        )}
      </div>
    </nav>
  );
}

// ── Toolbar and filters ──────────────────────────────────────────────────────

/** The strip above a table: search on the left, filters beside it, trailing controls on the right. */
export function TableToolbar({
  children,
  trailing,
}: {
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-rule px-3 py-2.5">
      {children}
      {trailing && <div className="ml-auto flex items-center gap-2.5">{trailing}</div>}
    </div>
  );
}

/** A row of filter controls with a "Clear filters" button that appears only while a filter is active. */
export function FilterBar({
  children,
  activeCount,
  onClear,
}: {
  children: ReactNode;
  activeCount: number;
  onClear: () => void;
}) {
  return (
    <div role="group" aria-label="Filters" className="flex flex-wrap items-center gap-2">
      {children}
      {activeCount > 0 && (
        <Button variant="quiet" size="sm" onClick={onClear}>
          Clear filters ({activeCount})
        </Button>
      )}
    </div>
  );
}

/** A compact, labelled select for use in a FilterBar. */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <div className="w-40">
      <Select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

// ── DataTable ────────────────────────────────────────────────────────────────

export interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

const QUIET_ACTIONS =
  'opacity-50 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100 pointer-coarse:opacity-100';

type Breakpoint = 'sm' | 'md' | 'lg' | 'xl';
const showFromClass: Record<Breakpoint, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};

export interface Column<T> {
  id: string;
  /** Visible heading (also the accessible name of the column). */
  header: string;
  cell: (row: T) => ReactNode;
  /** The server-side sort key. When set, the heading is a sort control. */
  sortKey?: string;
  /** Direction applied the first time the column is chosen. Defaults to ascending. */
  firstDirection?: 'asc' | 'desc';
  align?: 'left' | 'right';
  /** Smallest viewport at which the column appears in the table. */
  showFrom?: Breakpoint;
  /** Tailwind width utilities for the column (e.g. `w-[34%] min-w-[14rem]`), applied to heading and cells. */
  width?: string;
  /** Tailwind utilities for the cells (e.g. `whitespace-nowrap`). */
  className?: string;
  /**
   * Presentation in the compact record list used below the `md` breakpoint:
   * `title` the main line, `meta` a secondary value (its heading is read by screen readers), `hidden` omitted.
   */
  mobile?: 'title' | 'meta' | 'hidden';
}

export interface DataTableProps<T> {
  /** Accessible name of the table, e.g. "Patients". */
  caption: string;
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  onRowClick?: (row: T) => void;
  /** Trailing per-row controls (a menu, a button). Clicks inside do not trigger onRowClick. */
  rowActions?: (row: T) => ReactNode;
  /** First load: skeleton rows keep the layout stable. */
  loading?: boolean;
  /** Refetching with older rows still showing. */
  refreshing?: boolean;
  error?: { title: string; message?: string; onRetry: () => void } | null;
  empty: ReactNode;
  toolbar?: ReactNode;
  pagination?: PaginationProps;
  /** Skeleton row count; defaults to the page size (max 12). */
  skeletonRows?: number;
  /**
   * Dim the row actions until the row is hovered or focused (always full strength on touch screens).
   * For a repeated overflow menu (⋯), where an identical control on every row is noise. Leave off for
   * direct actions such as "Start" or "Check in", which must stay clearly available.
   */
  quietActions?: boolean;
  /** Draw the outer border and rounded corners. Turn off when the table sits directly on the page. */
  bordered?: boolean;
}

/**
 * The product's table: server-driven sorting and pagination, stable layout while loading, an
 * accessible sort control in each sortable heading, and a record list instead of a table on narrow screens.
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  sort,
  onSortChange,
  onRowClick,
  rowActions,
  loading,
  refreshing,
  error,
  empty,
  toolbar,
  pagination,
  skeletonRows,
  quietActions,
  bordered = true,
}: DataTableProps<T>) {
  const skeletonCount = skeletonRows ?? Math.min(pagination?.pageSize ?? 8, 12);
  const titleColumns = columns.filter((c) => c.mobile === 'title');
  const metaColumns = columns.filter((c) => c.mobile === 'meta');
  const showEmpty = !loading && !error && rows && rows.length === 0;

  const toggleSort = (c: Column<T>) => {
    if (!c.sortKey || !onSortChange) return;
    onSortChange(
      sort?.key === c.sortKey
        ? { key: c.sortKey, direction: sort.direction === 'asc' ? 'desc' : 'asc' }
        : { key: c.sortKey, direction: c.firstDirection ?? 'asc' },
    );
  };

  return (
    <div
      className={cn(
        bordered
          ? 'overflow-hidden rounded-lg border border-rule bg-surface'
          : 'border-t border-rule-strong',
      )}
    >
      {toolbar}
      {error ? (
        <ErrorState title={error.title} message={error.message} onRetry={error.onRetry} />
      ) : showEmpty ? (
        empty
      ) : (
        <div
          aria-busy={loading || refreshing || undefined}
          className={cn('transition-opacity', refreshing && 'opacity-60')}
        >
          {/* Table: from md up. */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">{caption}</caption>
              <thead>
                <tr>
                  {columns.map((c) => {
                    const active = sort?.key === c.sortKey;
                    return (
                      <th
                        key={c.id}
                        scope="col"
                        aria-sort={
                          c.sortKey
                            ? active
                              ? sort?.direction === 'asc'
                                ? 'ascending'
                                : 'descending'
                              : 'none'
                            : undefined
                        }
                        className={cn(
                          'border-b border-rule-strong px-3 py-2 text-xs font-medium whitespace-nowrap text-ink-600 first:pl-4',
                          bordered && 'bg-sunken',
                          active && 'text-ink-950',
                          c.align === 'right' && 'text-right',
                          c.showFrom && showFromClass[c.showFrom],
                          c.width,
                        )}
                      >
                        {c.sortKey && onSortChange ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(c)}
                            className={cn(
                              'group/sort -mx-1.5 inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 hover:text-ink-950',
                              c.align === 'right' && 'flex-row-reverse',
                              active && 'font-semibold text-ink-950',
                            )}
                          >
                            {c.header}
                            {active ? (
                              sort?.direction === 'asc' ? (
                                <ArrowUp className="size-3" aria-hidden />
                              ) : (
                                <ArrowDown className="size-3" aria-hidden />
                              )
                            ) : (
                              <ArrowUpDown
                                className="size-3 text-ink-400 opacity-0 transition-opacity group-hover/sort:opacity-100 group-focus-visible/sort:opacity-100 pointer-coarse:opacity-60"
                                aria-hidden
                              />
                            )}
                            <span className="sr-only">
                              {active
                                ? `, sorted ${sort?.direction === 'asc' ? 'ascending' : 'descending'}. Activate to reverse.`
                                : ', not sorted. Activate to sort.'}
                            </span>
                          </button>
                        ) : (
                          c.header
                        )}
                      </th>
                    );
                  })}
                  {rowActions && (
                    <th
                      scope="col"
                      className={cn(
                        'w-10 border-b border-rule-strong px-3 py-2',
                        bordered && 'bg-sunken',
                      )}
                    >
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-rule-soft">
                {loading || !rows
                  ? Array.from({ length: skeletonCount }, (_, i) => (
                      <tr key={i}>
                        {columns.map((c, ci) => (
                          <td
                            key={c.id}
                            className={cn(
                              'px-3 py-3.5 first:pl-4',
                              c.showFrom && showFromClass[c.showFrom],
                              c.width,
                            )}
                          >
                            <Skeleton
                              className={cn(
                                'h-4',
                                ci === 0 ? 'w-40' : 'w-20',
                                c.align === 'right' && 'ml-auto',
                              )}
                            />
                          </td>
                        ))}
                        {rowActions && <td className="px-3" />}
                      </tr>
                    ))
                  : rows.map((row) => (
                      <tr
                        key={rowKey(row)}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                        className={cn(
                          'group/row transition-colors focus-within:bg-sunken hover:bg-sunken',
                          onRowClick && 'cursor-pointer',
                        )}
                      >
                        {columns.map((c, ci) => (
                          <td
                            key={c.id}
                            className={cn(
                              'px-3 py-2.5 align-middle first:pl-4',
                              ci === 0 &&
                                'group-focus-within/row:shadow-[inset_2px_0_0_var(--color-green-700)] group-hover/row:shadow-[inset_2px_0_0_var(--color-green-700)]',
                              c.align === 'right' && 'text-right',
                              c.showFrom && showFromClass[c.showFrom],
                              c.width,
                              c.className,
                            )}
                          >
                            {c.cell(row)}
                          </td>
                        ))}
                        {rowActions && (
                          <td
                            className="w-10 px-2 py-1 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className={cn(quietActions && QUIET_ACTIONS)}>
                              {rowActions(row)}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Sorting on narrow screens, where headings are not shown. */}
          {onSortChange && columns.some((c) => c.sortKey) && (
            <div className="flex items-center gap-2 border-b border-rule-soft px-4 py-2 md:hidden">
              <label htmlFor={`${caption}-sort`} className="text-xs text-ink-500">
                Sort by
              </label>
              <div className="min-w-0 flex-1">
                <Select
                  id={`${caption}-sort`}
                  value={sort ? `${sort.key}:${sort.direction}` : ''}
                  onChange={(e) => {
                    const [key, direction] = e.target.value.split(':') as [string, 'asc' | 'desc'];
                    onSortChange({ key, direction });
                  }}
                  className="h-7 text-sm"
                >
                  {columns
                    .filter((c) => c.sortKey)
                    .flatMap((c) => [
                      <option key={`${c.id}-asc`} value={`${c.sortKey}:asc`}>
                        {c.header}, ascending
                      </option>,
                      <option key={`${c.id}-desc`} value={`${c.sortKey}:desc`}>
                        {c.header}, descending
                      </option>,
                    ])}
                </Select>
              </div>
            </div>
          )}

          {/* Record list: below md. Same data, arranged for a narrow screen, with the same row actions. */}
          <ul className="divide-y divide-rule-soft md:hidden" aria-label={caption}>
            {loading || !rows
              ? Array.from({ length: Math.min(skeletonCount, 8) }, (_, i) => (
                  <li key={i} className="space-y-2 px-4 py-3.5">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-3 w-28" />
                  </li>
                ))
              : rows.map((row) => (
                  <li
                    key={rowKey(row)}
                    className={cn(
                      'flex items-start gap-2 px-4 py-3',
                      onRowClick && 'cursor-pointer active:bg-lime-50',
                    )}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      {titleColumns.map((c) => (
                        <div key={c.id} className="min-w-0">
                          {c.cell(row)}
                        </div>
                      ))}
                      {metaColumns.length > 0 && (
                        <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-600">
                          {metaColumns.map((c) => (
                            <span key={c.id}>
                              <span className="sr-only">{c.header}: </span>
                              {c.cell(row)}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                    {rowActions && (
                      <div onClick={(e) => e.stopPropagation()}>{rowActions(row)}</div>
                    )}
                  </li>
                ))}
          </ul>
        </div>
      )}
      {pagination && !error && !showEmpty && <Pagination {...pagination} />}
    </div>
  );
}

export { EmptyState };
