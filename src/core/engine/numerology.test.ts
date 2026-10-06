import { describe, it, expect } from 'vitest';
import { reduceToRoot, lifePathNumber, numerologyThemeContributions } from './numerology';

describe('numerology (experimental, reflective only)', () => {
  it('reduces to a single digit', () => {
    expect(reduceToRoot(38)).toBe(2); // 3+8=11 → master preserved
    expect(reduceToRoot(19)).toBe(1); // 1+9=10 → 1
    expect(reduceToRoot(7)).toBe(7);
  });

  it('preserves master numbers 11, 22, 33', () => {
    expect(reduceToRoot(11)).toBe(11);
    expect(reduceToRoot(29)).toBe(11); // 2+9=11
    expect(reduceToRoot(22)).toBe(22);
  });

  it('computes a deterministic life-path number from a date', () => {
    // 1990-01-01 → 1+9+9+0+0+1+0+1 = 21 → 3
    expect(lifePathNumber('1990-01-01')).toBe(3);
    // Deterministic across runs
    expect(lifePathNumber('1990-01-01')).toBe(lifePathNumber('1990-01-01'));
  });

  it('returns null for invalid or missing dates', () => {
    expect(lifePathNumber('not-a-date')).toBeNull();
    expect(numerologyThemeContributions(undefined)).toBeNull();
    expect(numerologyThemeContributions('13-13-13')).toBeNull();
  });

  it('maps a valid date to theme contributions', () => {
    const contrib = numerologyThemeContributions('1990-01-01'); // root 3
    expect(contrib).not.toBeNull();
    expect(contrib!.creativity).toBe(90);
  });
});
