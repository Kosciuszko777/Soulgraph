import { describe, it, expect } from 'vitest';
import {
  normalizeLikert,
  consistency,
  straightLiningPenalty,
  scaleConfidence,
  scoreInstrumentScales,
} from './scoring';
import { jungInstrument } from './instruments/jung';
import type { ItemResponse } from './types';

describe('normalizeLikert', () => {
  it('maps endpoints and midpoint on a 5-point scale', () => {
    expect(normalizeLikert(1, 5, false)).toBe(0);
    expect(normalizeLikert(3, 5, false)).toBe(0.5);
    expect(normalizeLikert(5, 5, false)).toBe(1);
  });

  it('reverse-keys symmetrically', () => {
    expect(normalizeLikert(5, 5, true)).toBe(0);
    expect(normalizeLikert(1, 5, true)).toBe(1);
    expect(normalizeLikert(3, 5, true)).toBe(0.5);
  });

  it('clamps out-of-range answers', () => {
    expect(normalizeLikert(0, 5, false)).toBe(0);
    expect(normalizeLikert(9, 5, false)).toBe(1);
  });
});

describe('consistency', () => {
  it('is highest when all items agree', () => {
    expect(consistency([1, 1, 1])).toBe(1);
    expect(consistency([0, 0, 0])).toBe(1);
  });
  it('is lowest when items maximally disagree', () => {
    expect(consistency([0, 1, 0, 1])).toBeCloseTo(0, 5);
  });
  it('treats a single item as moderately consistent', () => {
    expect(consistency([0.8])).toBe(0.75);
  });
});

describe('straightLiningPenalty', () => {
  it('flags all-identical answers', () => {
    const resp: ItemResponse[] = Array.from({ length: 6 }, (_, i) => ({ item_id: `x${i}`, value: 4 }));
    expect(straightLiningPenalty(resp)).toBe(1);
  });
  it('does not flag varied answers', () => {
    const resp: ItemResponse[] = [1, 2, 3, 4, 5].map((v, i) => ({ item_id: `x${i}`, value: v }));
    expect(straightLiningPenalty(resp)).toBe(0);
  });
});

describe('scaleConfidence', () => {
  it('rises with coverage and consistency', () => {
    const low = scaleConfidence({ coverage: 0.2, consistency: 0.3, speedPenalty: 0 });
    const high = scaleConfidence({ coverage: 1, consistency: 1, speedPenalty: 0 });
    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThanOrEqual(1);
  });
  it('is reduced by the speed penalty', () => {
    const clean = scaleConfidence({ coverage: 1, consistency: 1, speedPenalty: 0 });
    const rushed = scaleConfidence({ coverage: 1, consistency: 1, speedPenalty: 1 });
    expect(rushed).toBeLessThan(clean);
  });
});

describe('scoreInstrumentScales — reverse-keying and bounds', () => {
  it('reverse-keyed items pull the scale down', () => {
    // Answer every energy item "5". Forward items → 1.0, reverse items → 0.0.
    const responses: ItemResponse[] = jungInstrument.items
      .filter((i) => i.keying[0].scale === 'energy')
      .map((i) => ({ item_id: i.id, value: 5 }));
    const { scales } = scoreInstrumentScales(jungInstrument, responses);
    const energy = scales.find((s) => s.scale === 'energy')!;
    // Four forward + four reverse, equal weights → mean 0.5 → 50.
    expect(energy.value).toBe(50);
  });

  it('keeps all values within 0–100', () => {
    const responses: ItemResponse[] = jungInstrument.items.map((i) => ({ item_id: i.id, value: 5 }));
    const { scales } = scoreInstrumentScales(jungInstrument, responses);
    for (const s of scales) {
      expect(s.value).toBeGreaterThanOrEqual(0);
      expect(s.value).toBeLessThanOrEqual(100);
      expect(s.confidence).toBeGreaterThanOrEqual(0);
      expect(s.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('omits unlit scales (no answered items)', () => {
    const { scales } = scoreInstrumentScales(jungInstrument, []);
    expect(scales).toHaveLength(0);
  });

  it('applies a speed penalty for implausibly fast responses', () => {
    const fast: ItemResponse[] = jungInstrument.items
      .filter((i) => i.keying[0].scale === 'perception')
      .map((i) => ({ item_id: i.id, value: 4, rt_ms: 100 }));
    const slow: ItemResponse[] = jungInstrument.items
      .filter((i) => i.keying[0].scale === 'perception')
      .map((i) => ({ item_id: i.id, value: 4, rt_ms: 3000 }));
    const fastConf = scoreInstrumentScales(jungInstrument, fast).scales.find((s) => s.scale === 'perception')!.confidence;
    const slowConf = scoreInstrumentScales(jungInstrument, slow).scales.find((s) => s.scale === 'perception')!.confidence;
    expect(fastConf).toBeLessThan(slowConf);
  });
});
