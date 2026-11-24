import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTableState } from './table-state';

const config = {
  sorts: ['name', 'mrn', 'registered'] as const,
  defaultSort: (hasQuery: boolean) =>
    hasQuery
      ? { sort: 'name' as const, order: 'asc' as const }
      : { sort: 'registered' as const, order: 'desc' as const },
  filters: ['role'] as const,
};

function setup(url: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  );
  return renderHook(
    () => {
      const table = useTableState(config);
      return { ...table, search: useLocation().search };
    },
    { wrapper },
  );
}

function phoneWidth(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches, media: query }));
}

describe('useTableState', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('defaults to 10 rows on a phone-width screen, but a size in the URL always wins', () => {
    phoneWidth(true);
    expect(setup('/').result.current.state.pageSize).toBe(10);
    expect(setup('/?pageSize=50').result.current.state.pageSize).toBe(50);
    phoneWidth(false);
    expect(setup('/').result.current.state.pageSize).toBe(25);
  });

  it('reads page, size, search, sort and filters from the URL', () => {
    const { result } = setup('/?page=3&pageSize=50&q=ada&sort=mrn&order=desc&role=NURSE');
    expect(result.current.state).toMatchObject({
      page: 3,
      pageSize: 50,
      q: 'ada',
      sort: 'mrn',
      order: 'desc',
      filters: { role: 'NURSE' },
    });
  });

  it('falls back to safe defaults for invalid or hostile values', () => {
    const { result } = setup('/?page=-4&pageSize=9999&sort=passwordHash&order=sideways');
    expect(result.current.state).toMatchObject({
      page: 1,
      pageSize: 25,
      sort: 'registered',
      order: 'desc',
    });
    expect(setup('/?page=abc').result.current.state.page).toBe(1);
  });

  it('defaults to name order while searching and to newest first otherwise', () => {
    expect(setup('/?q=ada').result.current.state).toMatchObject({ sort: 'name', order: 'asc' });
    expect(setup('/').result.current.state).toMatchObject({ sort: 'registered', order: 'desc' });
  });

  it('returns to page one when search, sort, filters or page size change, but not for plain page changes', () => {
    const { result } = setup('/?page=4');
    act(() => result.current.update({ page: 5 }));
    expect(result.current.state.page).toBe(5);
    act(() => result.current.update({ q: 'bello' }, { resetPage: true }));
    expect(result.current.state).toMatchObject({ q: 'bello', page: 1 });
    act(() => result.current.update({ page: 3 }));
    act(() => result.current.update({ sort: 'mrn', order: 'asc' }, { resetPage: true }));
    expect(result.current.state).toMatchObject({ sort: 'mrn', order: 'asc', page: 1 });
    act(() => result.current.update({ page: 2 }));
    act(() => result.current.update({ filters: { role: 'NURSE' } }, { resetPage: true }));
    expect(result.current.state.filters.role).toBe('NURSE');
    expect(result.current.state.page).toBe(1);
    expect(result.current.activeFilterCount).toBe(1);
    act(() => result.current.update({ pageSize: 10 }, { resetPage: true }));
    expect(result.current.search).toContain('pageSize=10');
  });

  it('keeps the URL tidy: page one and empty values are omitted', () => {
    const { result } = setup('/?page=2&q=ada');
    act(() => result.current.update({ page: 1, q: '' }));
    expect(result.current.search).toBe('');
  });
});
