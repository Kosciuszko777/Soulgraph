/**
 * Numerological birth-number arithmetic (Experimental SoulGraph).
 *
 * Deterministic digit-sum reduction in the tradition of numerological "life
 * path" numbers. Computed LOCALLY from a birth date. The birth date is optional
 * and, when provided, is stored ONLY inside the encrypted Life Pattern facet —
 * never required, never sent anywhere.
 *
 * HONEST NOTE: numerological patterns have no empirical validation. This is a
 * reflective lens, not a measurement. Labelled Experimental SoulGraph.
 *
 * Pure TypeScript. Deterministic.
 */

/** Reduce a number to a single digit, preserving master numbers 11, 22, 33. */
export function reduceToRoot(n: number): number {
  let value = Math.abs(Math.trunc(n));
  while (value > 9 && value !== 11 && value !== 22 && value !== 33) {
    value = String(value)
      .split('')
      .reduce((sum, d) => sum + Number(d), 0);
  }
  return value;
}

/** Sum all digits of a YYYY-MM-DD date and reduce to a life-path root number. */
export function lifePathNumber(birthDate: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!m) return null;
  const digits = birthDate.replace(/-/g, '');
  const total = digits.split('').reduce((sum, d) => sum + Number(d), 0);
  return reduceToRoot(total);
}

/**
 * Compute numerological inputs from a birth date, as a map of 0–100 "lens"
 * contributions to Life Pattern themes. These are deterministic but
 * explicitly experimental and reflective. Returns null if no/invalid date.
 */
export function numerologyThemeContributions(
  birthDate: string | undefined,
): Record<string, number> | null {
  if (!birthDate) return null;
  const root = lifePathNumber(birthDate);
  if (root === null) return null;

  // A fixed, documented mapping from life-path roots to theme leanings. This is
  // a reflective lens, not a claim about the person. Values are 0–100.
  const MAP: Record<number, Record<string, number>> = {
    1: { independence: 90, creativity: 50, discipline: 60 },
    2: { trust: 85, service: 70, independence: 30 },
    3: { creativity: 90, service: 50, trust: 55 },
    4: { discipline: 90, service: 60, creativity: 35 },
    5: { transformation: 85, independence: 70, discipline: 30 },
    6: { service: 90, trust: 70, creativity: 55 },
    7: { transformation: 75, discipline: 60, trust: 45 },
    8: { discipline: 80, independence: 70, service: 50 },
    9: { service: 85, creativity: 65, transformation: 70 },
    11: { trust: 80, transformation: 85, creativity: 70 },
    22: { discipline: 85, service: 80, transformation: 75 },
    33: { service: 95, trust: 85, creativity: 70 },
  };

  return MAP[root] ?? {};
}
