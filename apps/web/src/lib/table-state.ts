import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

export interface TableStateConfig<S extends string> {
  /** Page sizes offered to the user. The first is the default. */
  pageSizes?: readonly number[];
  /**
   * Default page size on a phone-width screen when the URL names none (a long list is hard to scroll).
   * Defaults to 10 when that is one of the offered sizes. The user can still choose any offered size.
   */
  compactPageSize?: number;
  /** Allowed sort keys; anything else in the URL is ignored. */
  sorts: readonly S[];
  /** Applied when the URL names no (valid) sort. May depend on whether a search is active. */
  defaultSort: (hasQuery: boolean) => { sort: S; order: 'asc' | 'desc' };
  /** Additional string filters kept in the URL. */
  filters?: readonly string[];
}

export interface TableState<S extends string> {
  page: number;
  pageSize: number;
  q: string;
  sort: S;
  order: 'asc' | 'desc';
  filters: Record<string, string>;
}

/**
 * Table state lives in the URL (page, pageSize, q, sort, order and filters), so refresh, back and
 * bookmarks behave. Changing the search, a filter, the sort or the page size returns to page 1.
 * Invalid or unknown values in the URL fall back to defaults instead of reaching the API.
 */
export function useTableState<S extends string>(config: TableStateConfig<S>) {
  const [params, setParams] = useSearchParams();
  const sizes = config.pageSizes ?? [25, 10, 50];

  const state = useMemo<TableState<S>>(() => {
    const q = params.get('q') ?? '';
    const sizeParam = Number(params.get('pageSize'));
    const sortParam = params.get('sort') as S | null;
    const fallback = config.defaultSort(q.trim().length > 0);
    const compact =
      typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 767px)').matches;
    const compactSize = config.compactPageSize ?? (sizes.includes(10) ? 10 : undefined);
    const defaultSize =
      compact && compactSize !== undefined && sizes.includes(compactSize) ? compactSize : sizes[0]!;
    const sort = sortParam && config.sorts.includes(sortParam) ? sortParam : fallback.sort;
    const orderParam = params.get('order');
    const order =
      orderParam === 'asc' || orderParam === 'desc'
        ? orderParam
        : sort === fallback.sort
          ? fallback.order
          : 'asc';
    return {
      page: Math.max(1, Math.floor(Number(params.get('page'))) || 1),
      pageSize: sizes.includes(sizeParam) ? sizeParam : defaultSize,
      q,
      sort,
      order,
      filters: Object.fromEntries((config.filters ?? []).map((f) => [f, params.get(f) ?? ''])),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const update = useCallback(
    (
      changes: Partial<Omit<TableState<S>, 'filters'>> & { filters?: Record<string, string> },
      options: { resetPage?: boolean; replace?: boolean } = {},
    ) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const set = (key: string, value: string | number | undefined) =>
            value === undefined || value === '' ? next.delete(key) : next.set(key, String(value));
          if ('q' in changes) set('q', changes.q);
          if ('sort' in changes) set('sort', changes.sort);
          if ('order' in changes) set('order', changes.order);
          if ('pageSize' in changes) set('pageSize', changes.pageSize);
          if ('page' in changes) set('page', changes.page === 1 ? undefined : changes.page);
          for (const [key, value] of Object.entries(changes.filters ?? {})) set(key, value);
          if (options.resetPage) next.delete('page');
          return next;
        },
        { replace: options.replace ?? false },
      );
    },
    [setParams],
  );

  const activeFilterCount = Object.values(state.filters).filter(Boolean).length;
  return { state, update, activeFilterCount, pageSizes: sizes };
}
