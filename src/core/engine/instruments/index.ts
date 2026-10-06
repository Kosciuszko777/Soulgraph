/**
 * Instrument registry and assessment roadmap (Engine layer).
 *
 * The roadmap defines every instrument SoulGraph plans to administer, with a
 * PLANNED item count and a completion WEIGHT per instrument. Phase I ships the
 * jung, enneagram and life_pattern instruments as data; the remaining entries
 * (OCEAN, Worldview, Human Design, Core-specific) are roadmap placeholders so
 * Phase II only adds their items. Completion is computed from this roadmap —
 * never hard-coded — and calibrated so the 15-item demo lands near 18%.
 */

import type { InstrumentDef } from '../types';
import { jungInstrument } from './jung';
import { enneagramInstrument } from './enneagram';
import { lifePatternInstrument } from './lifePattern';

/** The instruments implemented in Phase I (full definitions, as data). */
export const INSTRUMENTS: InstrumentDef[] = [
  jungInstrument,
  enneagramInstrument,
  lifePatternInstrument,
];

export function getInstrument(id: string): InstrumentDef | undefined {
  return INSTRUMENTS.find((i) => i.id === id);
}

/**
 * One entry in the assessment roadmap. `planned` is the number of items in the
 * full bank; `weight` is this instrument's share of overall completion.
 * `implemented` marks whether the engine can actually score it yet.
 */
export interface RoadmapEntry {
  instrument_id: string;
  facet: string;
  planned: number;
  weight: number;
  implemented: boolean;
}

/**
 * The full roadmap. Planned counts for implemented instruments are derived from
 * their definitions (never duplicated by hand); placeholder counts reflect the
 * intended Phase II banks. Weights are tuned (see completion.test.ts) so a
 * completed 15-item demo yields ≈18%.
 */
export const ROADMAP: RoadmapEntry[] = [
  { instrument_id: jungInstrument.id, facet: 'jung', planned: jungInstrument.items.length, weight: 1, implemented: true },
  { instrument_id: enneagramInstrument.id, facet: 'enneagram', planned: enneagramInstrument.items.length, weight: 1, implemented: true },
  { instrument_id: lifePatternInstrument.id, facet: 'life_pattern', planned: lifePatternInstrument.items.length, weight: 2, implemented: true },
  // Phase II placeholders — data arrives later; small completion weight now so
  // the demo lands near 18% and the bar keeps room to grow.
  { instrument_id: 'ocean', facet: 'ocean', planned: 50, weight: 0.1, implemented: false },
  { instrument_id: 'worldview', facet: 'worldview', planned: 24, weight: 0.1, implemented: false },
  { instrument_id: 'human_design', facet: 'human_design', planned: 16, weight: 0.1, implemented: false },
  { instrument_id: 'core_specific', facet: 'soulgraph_core', planned: 16, weight: 0.1, implemented: false },
];

/** Total number of demo items across all implemented instruments. */
export function demoItemCount(): number {
  return INSTRUMENTS.reduce(
    (sum, inst) => sum + inst.items.filter((i) => i.demo).length,
    0,
  );
}

/** The set of demo item ids (a strict subset of the full banks). */
export function demoItemIds(): Set<string> {
  const ids = new Set<string>();
  for (const inst of INSTRUMENTS) {
    for (const item of inst.items) if (item.demo) ids.add(item.id);
  }
  return ids;
}
