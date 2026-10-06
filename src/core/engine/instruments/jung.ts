/**
 * Jungian Preferences (Interpretive).
 *
 * Four continuous preference axes, each scored 0–100 with a clarity score:
 *   - energy:     0 = introverted  ←→ 100 = extraverted
 *   - perception: 0 = intuition    ←→ 100 = sensing
 *   - judgment:   0 = feeling      ←→ 100 = thinking
 *   - lifestyle:  0 = perceiving   ←→ 100 = judging
 *
 * A four-letter code is offered only as a convenience label, always shown with
 * the continuous positions and "a tendency, not a box". 32 items, 5 demo.
 *
 * All item text is original and lives in i18n (src/i18n/instruments). It does
 * NOT reproduce or paraphrase any proprietary instrument, and avoids all
 * trademarked names.
 */

import type { InstrumentDef, ItemDef } from '../types';

const INSTRUMENT_ID = 'jung_preferences';
const VERSION = '1.0.0';

/** Helper to build a Likert5 item keyed to a single axis scale. */
function item(
  n: number,
  scale: string,
  reverse: boolean,
  demo: boolean,
): ItemDef {
  const id = `${scale}_${String(n).padStart(2, '0')}`;
  return {
    id,
    prompt_key: `instrument.jung.item.${id}`,
    format: 'likert5',
    keying: [{ scale, weight: 1, reverse }],
    demo,
  };
}

// 8 items per axis (mix of forward / reverse keying). 5 items flagged demo —
// one per axis for energy/perception/judgment/lifestyle plus a second energy.
const items: ItemDef[] = [
  // energy — high = extraverted
  item(1, 'energy', false, true),
  item(2, 'energy', true, true),
  item(3, 'energy', false, false),
  item(4, 'energy', true, false),
  item(5, 'energy', false, false),
  item(6, 'energy', true, false),
  item(7, 'energy', false, false),
  item(8, 'energy', true, false),
  // perception — high = sensing
  item(1, 'perception', false, true),
  item(2, 'perception', true, false),
  item(3, 'perception', false, false),
  item(4, 'perception', true, false),
  item(5, 'perception', false, false),
  item(6, 'perception', true, false),
  item(7, 'perception', false, false),
  item(8, 'perception', true, false),
  // judgment — high = thinking
  item(1, 'judgment', false, true),
  item(2, 'judgment', true, false),
  item(3, 'judgment', false, false),
  item(4, 'judgment', true, false),
  item(5, 'judgment', false, false),
  item(6, 'judgment', true, false),
  item(7, 'judgment', false, false),
  item(8, 'judgment', true, false),
  // lifestyle — high = judging
  item(1, 'lifestyle', false, true),
  item(2, 'lifestyle', true, false),
  item(3, 'lifestyle', false, false),
  item(4, 'lifestyle', true, false),
  item(5, 'lifestyle', false, false),
  item(6, 'lifestyle', true, false),
  item(7, 'lifestyle', false, false),
  item(8, 'lifestyle', true, false),
];

export const jungInstrument: InstrumentDef = {
  id: INSTRUMENT_ID,
  version: VERSION,
  facet: 'jung',
  evidence: 'interpretive',
  name_key: 'instrument.jung.name',
  note_key: 'instrument.jung.note',
  scoring: 'continuous_axes',
  scales: [
    { id: 'energy', label_key: 'instrument.jung.scale.energy', description_key: 'instrument.jung.scale.energy.desc', evidence: 'interpretive' },
    { id: 'perception', label_key: 'instrument.jung.scale.perception', description_key: 'instrument.jung.scale.perception.desc', evidence: 'interpretive' },
    { id: 'judgment', label_key: 'instrument.jung.scale.judgment', description_key: 'instrument.jung.scale.judgment.desc', evidence: 'interpretive' },
    { id: 'lifestyle', label_key: 'instrument.jung.scale.lifestyle', description_key: 'instrument.jung.scale.lifestyle.desc', evidence: 'interpretive' },
  ],
  axes: [
    { id: 'energy', positive_scale: 'energy', negative_scale: 'energy', code_positive: 'E', code_negative: 'I' },
    { id: 'perception', positive_scale: 'perception', negative_scale: 'perception', code_positive: 'S', code_negative: 'N' },
    { id: 'judgment', positive_scale: 'judgment', negative_scale: 'judgment', code_positive: 'T', code_negative: 'F' },
    { id: 'lifestyle', positive_scale: 'lifestyle', negative_scale: 'lifestyle', code_positive: 'J', code_negative: 'P' },
  ],
  items,
};
