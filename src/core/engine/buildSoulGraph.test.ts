import { describe, it, expect } from 'vitest';
import { buildSoulGraph, type BuildOptions } from './buildSoulGraph';
import { INSTRUMENTS, demoItemCount, demoItemIds } from './instruments';
import { jungInstrument } from './instruments/jung';
import { enneagramInstrument } from './instruments/enneagram';
import { computeCompletion } from './completion';
import { hashResponses } from './hash';
import { SoulGraphVersionSchema } from '@/core/graph/schema';
import type { ItemResponse, ResponseSet } from './types';

const PUBKEY = 'a'.repeat(64);

function opts(overrides: Partial<BuildOptions> = {}): BuildOptions {
  return {
    pubkey: PUBKEY,
    assessment_run_id: 'run-1',
    version_id: 'ver-1',
    created_at: 1_700_000_000,
    ...overrides,
  };
}

/** Answer every item of the given instruments with a fixed Likert value. */
function answerAll(value: number, instrumentIds?: string[]): ItemResponse[] {
  const out: ItemResponse[] = [];
  for (const inst of INSTRUMENTS) {
    if (instrumentIds && !instrumentIds.includes(inst.id)) continue;
    for (const item of inst.items) out.push({ item_id: item.id, value });
  }
  return out;
}

/** Answer only the demo subset. */
function answerDemo(value: number): ItemResponse[] {
  const demo = demoItemIds();
  const out: ItemResponse[] = [];
  for (const inst of INSTRUMENTS) {
    for (const item of inst.items) if (demo.has(item.id)) out.push({ item_id: item.id, value });
  }
  return out;
}

describe('buildSoulGraph — schema & determinism', () => {
  it('produces a schema-valid SoulGraphVersion', () => {
    const set: ResponseSet = { responses: answerAll(4) };
    const version = buildSoulGraph(set, opts());
    const parsed = SoulGraphVersionSchema.safeParse(version);
    expect(parsed.success).toBe(true);
  });

  it('is deterministic: same input → same hash and same output every run', () => {
    const set: ResponseSet = { responses: answerAll(4) };
    const a = buildSoulGraph(set, opts());
    const b = buildSoulGraph(set, opts());
    expect(a.graph.provenance.responses_hash).toBe(b.graph.provenance.responses_hash);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    // Hash is a 64-char hex string.
    expect(a.graph.provenance.responses_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hash is independent of response ordering', () => {
    const responses = answerAll(4);
    const h1 = hashResponses({ responses });
    const h2 = hashResponses({ responses: [...responses].reverse() });
    expect(h1).toBe(h2);
  });

  it('stamps every scale value with instrument + engine version', () => {
    const version = buildSoulGraph({ responses: answerAll(4) }, opts());
    const jung = version.graph.jung!;
    for (const value of Object.values(jung.scales)) {
      expect(value.instrument_id).toBe(jungInstrument.id);
      expect(value.instrument_version).toBe(jungInstrument.version);
      expect(value.engine_version).toBeTruthy();
    }
  });
});

describe('buildSoulGraph — golden file (fixed responses → exact output)', () => {
  it('matches expected Jung axis values for a fixed answer pattern', () => {
    // Answer all forward-keyed energy items "5" and reverse "5" → each axis 50.
    // Instead, build a deterministic mixed pattern: all items "4".
    const version = buildSoulGraph({ responses: answerAll(4) }, opts());
    const jung = version.graph.jung!;
    // With every item "4": forward → 0.75, reverse → 0.25; 4 each → mean 0.5 → 50.
    expect(jung.scales.energy.value).toBe(50);
    expect(jung.scales.perception.value).toBe(50);
    expect(jung.scales.judgment.value).toBe(50);
    expect(jung.scales.lifestyle.value).toBe(50);
  });

  it('produces a clear extraverted lean when forward items are high and reverse low', () => {
    const responses: ItemResponse[] = jungInstrument.items
      .filter((i) => i.keying[0].scale === 'energy')
      .map((i) => ({ item_id: i.id, value: i.keying[0].reverse ? 1 : 5 }));
    const version = buildSoulGraph({ responses }, opts());
    const energy = version.graph.jung!.scales.energy;
    expect(energy.value).toBe(100);
  });
});

describe('buildSoulGraph — Enneagram tie handling', () => {
  it('declines to name a dominant type when the top two are within the margin', () => {
    // Give every type the same answer → all tied → margin 0 → not clear.
    const responses: ItemResponse[] = enneagramInstrument.items.map((i) => ({ item_id: i.id, value: 3 }));
    const version = buildSoulGraph({ responses }, opts());
    const enn = version.graph.enneagram!;
    expect(enn.dominant_type).toBeUndefined();
    expect(enn.wing).toBeUndefined();
  });

  it('names a dominant type and wing when one type clearly leads', () => {
    // Type 8 strongly endorsed; others minimal. (Item t8_4 is reverse-keyed.)
    const responses: ItemResponse[] = enneagramInstrument.items.map((i) => {
      const type = i.keying[0].scale;
      const reverse = i.keying[0].reverse;
      if (type === '8') return { item_id: i.id, value: reverse ? 1 : 5 };
      return { item_id: i.id, value: reverse ? 5 : 1 };
    });
    const version = buildSoulGraph({ responses }, opts());
    const enn = version.graph.enneagram!;
    expect(enn.dominant_type).toBe(8);
    expect([7, 9]).toContain(enn.wing);
  });
});

describe('buildSoulGraph — Core unlit behavior', () => {
  it('omits Core when nothing is answered', () => {
    const version = buildSoulGraph({ responses: [] }, opts());
    expect(version.graph.soulgraph_core).toBeNull();
    expect(version.graph.jung).toBeNull();
    expect(version.graph.enneagram).toBeNull();
  });

  it('lights Core dimensions only from available facets, always experimental', () => {
    const version = buildSoulGraph({ responses: answerAll(4) }, opts());
    const core = version.graph.soulgraph_core!;
    expect(Object.keys(core.scales).length).toBeGreaterThan(0);
    for (const value of Object.values(core.scales)) {
      expect(value.evidence).toBe('experimental');
    }
  });
});

describe('completion', () => {
  it('finishing the 15-item demo yields approximately 18%', () => {
    expect(demoItemCount()).toBe(15);
    const completion = computeCompletion(answerDemo(4));
    expect(completion).toBeGreaterThanOrEqual(0.16);
    expect(completion).toBeLessThanOrEqual(0.2);
  });

  it('is 0 with no answers and rises toward 1 as more is answered', () => {
    expect(computeCompletion([])).toBe(0);
    const demo = computeCompletion(answerDemo(4));
    const full = computeCompletion(answerAll(4));
    expect(full).toBeGreaterThan(demo);
  });
});

describe('demo subset carries over (never asked twice)', () => {
  it('every demo item id exists in the full bank', () => {
    const demo = demoItemIds();
    const allIds = new Set(INSTRUMENTS.flatMap((i) => i.items.map((it) => it.id)));
    for (const id of demo) {
      expect(allIds.has(id)).toBe(true);
    }
  });

  it('demo answers reused in the full assessment keep the same item ids', () => {
    // Build from demo, then from demo+rest; demo items are the same ids.
    const demoResponses = answerDemo(4);
    const fullResponses = answerAll(4);
    const demoIds = new Set(demoResponses.map((r) => r.item_id));
    for (const r of demoIds) {
      expect(fullResponses.some((fr) => fr.item_id === r)).toBe(true);
    }
  });
});

describe('versioning', () => {
  it('increments sequence from a previous version', () => {
    const v0 = buildSoulGraph({ responses: answerDemo(4) }, opts({ version_id: 'v0' }));
    const v1 = buildSoulGraph({ responses: answerAll(4) }, opts({ version_id: 'v1' }), v0);
    expect(v0.sequence).toBe(0);
    expect(v1.sequence).toBe(1);
  });
});

describe('numerology blends into life pattern only when a birth date is given', () => {
  it('changes life_pattern values deterministically with a birth date', () => {
    const base = buildSoulGraph({ responses: answerAll(3) }, opts());
    const withDate = buildSoulGraph({ responses: answerAll(3), birth_date: '1990-01-01' }, opts());
    // creativity gets a strong numerological lens for root 3.
    expect(withDate.graph.life_pattern!.scales.creativity.value).not.toBe(
      base.graph.life_pattern!.scales.creativity.value,
    );
    expect(withDate.graph.life_pattern!.pattern_code).toBe('3');
  });
});
