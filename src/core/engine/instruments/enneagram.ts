/**
 * Enneagram (Interpretive).
 *
 * A score for each of the nine types. The engine derives a primary type, a
 * likely wing (the higher-scoring adjacent type), and the confidence margin
 * between the top two types. When that margin is small the UI MUST say the
 * pattern is not yet clear rather than pick one — the engine exposes
 * `margin_clear` for exactly that. 45 items (5 per type), 5 demo.
 *
 * All item text is original (i18n), and does not reproduce or paraphrase RHETI,
 * Riso-Hudson, or any other proprietary Enneagram material.
 */

import type { InstrumentDef, ItemDef } from '../types';

const INSTRUMENT_ID = 'enneagram';
const VERSION = '1.0.0';

/** 5 Likert items per type (types 1..9). One demo item for types 1..5. */
function typeItems(type: number): ItemDef[] {
  return [1, 2, 3, 4, 5].map((n) => {
    const id = `t${type}_${n}`;
    return {
      id,
      prompt_key: `instrument.enneagram.item.${id}`,
      format: 'likert5' as const,
      // A couple of reverse-keyed items per type guard against acquiescence.
      keying: [{ scale: String(type), weight: 1, reverse: n === 4 }],
      // One demo item for the first five types → 5 demo items total.
      demo: n === 1 && type <= 5,
    };
  });
}

const items: ItemDef[] = Array.from({ length: 9 }, (_, i) => typeItems(i + 1)).flat();

export const enneagramInstrument: InstrumentDef = {
  id: INSTRUMENT_ID,
  version: VERSION,
  facet: 'enneagram',
  evidence: 'interpretive',
  name_key: 'instrument.enneagram.name',
  note_key: 'instrument.enneagram.note',
  scoring: 'type_weights',
  scales: Array.from({ length: 9 }, (_, i) => {
    const type = String(i + 1);
    return {
      id: type,
      label_key: `instrument.enneagram.scale.${type}`,
      description_key: `instrument.enneagram.scale.${type}.desc`,
      evidence: 'interpretive' as const,
    };
  }),
  items,
};

/**
 * Margin (0–100 scale-point difference) below which the top-two types are
 * considered too close to call. Exposed so the UI can be honest.
 */
export const ENNEAGRAM_CLEAR_MARGIN = 8;
