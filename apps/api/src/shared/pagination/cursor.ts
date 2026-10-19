/** Opaque cursor pagination over items sorted by a descending string key. */
export type CursorPage<T> = { items: T[]; nextCursor?: string };

export const encodeCursor = (key: string): string => Buffer.from(key, 'utf8').toString('base64url');

export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64url').toString('utf8');
}

/**
 * `items` must be sorted by `keyOf` descending. Returns the next `limit` items strictly after `cursor`,
 * so entries appended later (larger keys) never shift pages that were already read.
 */
export function paginateByCursor<T>(
  items: T[],
  keyOf: (item: T) => string,
  cursor: string | undefined,
  limit = 50,
): CursorPage<T> {
  const after = cursor ? decodeCursor(cursor) : undefined;
  const remaining = after === undefined ? items : items.filter((item) => keyOf(item) < after);
  const pageItems = remaining.slice(0, limit);
  const last = pageItems[pageItems.length - 1];
  return {
    items: pageItems,
    nextCursor: remaining.length > limit && last ? encodeCursor(keyOf(last)) : undefined,
  };
}
