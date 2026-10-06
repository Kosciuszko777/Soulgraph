/**
 * Completion (Engine layer).
 *
 * completion = Σ_i weight_i · (answered_i / planned_i) / Σ_i weight_i
 *
 * computed across ALL instruments in the roadmap (including the Phase II
 * placeholders OCEAN, Worldview, Human Design and Core-specific). It is derived
 * from the roadmap, never hard-coded, and the roadmap weights are calibrated so
 * that finishing the 15-item demo yields ≈18% (see completion.test.ts).
 *
 * Pure TypeScript. Deterministic.
 */

import type { ItemResponse } from './types';
import { INSTRUMENTS, ROADMAP } from './instruments';

/** Count answered items per instrument id from a flat response list. */
function answeredByInstrument(responses: ItemResponse[]): Record<string, number> {
  const answered = new Set(responses.map((r) => r.item_id));
  const counts: Record<string, number> = {};
  for (const inst of INSTRUMENTS) {
    counts[inst.id] = inst.items.filter((i) => answered.has(i.id)).length;
  }
  return counts;
}

/** Overall completion in [0,1], weighted by instrument across the roadmap. */
export function computeCompletion(responses: ItemResponse[]): number {
  const answered = answeredByInstrument(responses);
  let num = 0;
  let den = 0;
  for (const entry of ROADMAP) {
    const a = answered[entry.instrument_id] ?? 0;
    const fraction = entry.planned > 0 ? Math.min(a, entry.planned) / entry.planned : 0;
    num += entry.weight * fraction;
    den += entry.weight;
  }
  return den > 0 ? num / den : 0;
}
