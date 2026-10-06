import { describe, it, expect } from 'vitest';
import { computeCore, CORE_DIMENSIONS, type CoreInputs } from './core-mapping';

describe('computeCore', () => {
  it('leaves every dimension unlit (null) when no inputs are available', () => {
    const core = computeCore({ values: {} });
    for (const dim of CORE_DIMENSIONS) {
      expect(core[dim].value).toBeNull();
      expect(core[dim].lit_inputs).toBe(0);
    }
  });

  it('lights a dimension only when a contributing input exists, and never as zero', () => {
    const inputs: CoreInputs = {
      values: { 'life_pattern.independence': { value: 80, confidence: 0.9 } },
    };
    const core = computeCore(inputs);
    // autonomy has a contribution from life_pattern.independence → lit
    expect(core.autonomy.value).not.toBeNull();
    expect(core.autonomy.lit_inputs).toBeGreaterThan(0);
    // a dimension with no available input stays unlit (null, not 0)
    expect(core.harmony.value).toBeNull();
  });

  it('keeps values within 0–100 even with negative-weight contributions', () => {
    const inputs: CoreInputs = {
      values: {
        'enneagram.8': { value: 100, confidence: 1 },
        'enneagram.9': { value: 0, confidence: 1 },
        'jung.judgment': { value: 100, confidence: 1 },
      },
    };
    const core = computeCore(inputs);
    expect(core.dominance.value).not.toBeNull();
    expect(core.dominance.value!).toBeGreaterThanOrEqual(0);
    expect(core.dominance.value!).toBeLessThanOrEqual(100);
  });

  it('applies invert (100 - value) for polar contributions', () => {
    // introspection = inverted jung.energy (introverted pole). Low energy → high introspection.
    const low = computeCore({ values: { 'jung.energy': { value: 10, confidence: 1 } } });
    const high = computeCore({ values: { 'jung.energy': { value: 90, confidence: 1 } } });
    expect(low.introspection.value!).toBeGreaterThan(high.introspection.value!);
  });
});
