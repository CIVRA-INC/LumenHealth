/**
 * Per-clinic hash chain utilities (#1326): compute `prevHash` and `sequence`
 * so each entry commits to its predecessor (detects deletion and reordering).
 */
export function computeChainLink(
  prevHash: string | undefined,
  prevSequence: number | undefined
): { prevHash: string | undefined; sequence: number } {
  return {
    prevHash,
    sequence: (prevSequence ?? 0) + 1,
  };
}

export function detectSequenceGaps(
  sequences: number[]
): number[] {
  const sorted = [...sequences].sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const expected = sorted[i - 1] + 1;
    if (sorted[i] > expected) {
      for (let s = expected; s < sorted[i]; s += 1) gaps.push(s);
    }
  }
  return gaps;
}

export function isCompleteRange(
  sequences: number[],
  first?: number,
  last?: number
): boolean {
  if (sequences.length === 0) return first === undefined && last === undefined;
  const min = first ?? Math.min(...sequences);
  const max = last ?? Math.max(...sequences);
  const set = new Set(sequences);
  for (let s = min; s <= max; s += 1) {
    if (!set.has(s)) return false;
  }
  return true;
}
