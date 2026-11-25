import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSearchInput } from './use-search-input';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useSearchInput', () => {
  it('commits only after the user pauses typing', () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useSearchInput('', commit, 250));
    act(() => result.current[1]('a'));
    act(() => vi.advanceTimersByTime(100));
    act(() => result.current[1]('ad'));
    act(() => vi.advanceTimersByTime(249));
    expect(commit).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(2));
    expect(commit).toHaveBeenCalledExactlyOnceWith('ad');
  });

  it('does not overwrite what the user typed while an earlier commit was settling', () => {
    const commit = vi.fn();
    const { result, rerender } = renderHook(({ url }) => useSearchInput(url, commit, 250), {
      initialProps: { url: '' },
    });
    act(() => result.current[1]('ad'));
    act(() => vi.advanceTimersByTime(260));
    act(() => result.current[1]('ada'));
    rerender({ url: 'ad' }); // the URL catches up with the earlier commit
    expect(result.current[0]).toBe('ada');
  });

  it('follows external URL changes such as back or clear', () => {
    const { result, rerender } = renderHook(
      ({ url }) => useSearchInput(url, () => undefined, 250),
      { initialProps: { url: 'bello' } },
    );
    expect(result.current[0]).toBe('bello');
    rerender({ url: '' });
    expect(result.current[0]).toBe('');
  });
});
