/**
 * Life Pattern (Experimental SoulGraph).
 *
 * Two parts:
 *  1. An OPTIONAL numerological birth-number calculation (see numerology.ts) —
 *     deterministic, computed locally, birth date stored only in the encrypted
 *     facet and never required.
 *  2. Reflective items producing life-theme scales: independence, creativity,
 *     service, discipline, trust, transformation.
 *
 * The whole instrument is Experimental, with an honest one-line note that
 * numerological patterns have no empirical validation and are a reflective
 * lens. 20 items, 5 demo. All item text is original (i18n).
 */

import type { InstrumentDef, ItemDef } from '../types';

const INSTRUMENT_ID = 'life_pattern';
const VERSION = '1.0.0';

export const LIFE_THEMES = [
  'independence',
  'creativity',
  'service',
  'discipline',
  'trust',
  'transformation',
] as const;

// 20 reflective items across six themes. Distribution: themes get 3–4 items
// each. 5 items flagged demo (one each for five themes).
interface Spec {
  theme: (typeof LIFE_THEMES)[number];
  reverse?: boolean;
  demo?: boolean;
}
const specs: Spec[] = [
  { theme: 'independence', demo: true },
  { theme: 'independence' },
  { theme: 'independence', reverse: true },
  { theme: 'creativity', demo: true },
  { theme: 'creativity' },
  { theme: 'creativity', reverse: true },
  { theme: 'service', demo: true },
  { theme: 'service' },
  { theme: 'service', reverse: true },
  { theme: 'discipline', demo: true },
  { theme: 'discipline' },
  { theme: 'discipline', reverse: true },
  { theme: 'trust', demo: true },
  { theme: 'trust' },
  { theme: 'trust', reverse: true },
  { theme: 'transformation' },
  { theme: 'transformation' },
  { theme: 'transformation', reverse: true },
  { theme: 'independence' },
  { theme: 'creativity' },
];

const counters: Record<string, number> = {};
const items: ItemDef[] = specs.map((s) => {
  counters[s.theme] = (counters[s.theme] ?? 0) + 1;
  const id = `${s.theme}_${counters[s.theme]}`;
  return {
    id,
    prompt_key: `instrument.life_pattern.item.${id}`,
    format: 'likert5',
    keying: [{ scale: s.theme, weight: 1, reverse: Boolean(s.reverse) }],
    demo: Boolean(s.demo),
  };
});

export const lifePatternInstrument: InstrumentDef = {
  id: INSTRUMENT_ID,
  version: VERSION,
  facet: 'life_pattern',
  evidence: 'experimental',
  name_key: 'instrument.life_pattern.name',
  note_key: 'instrument.life_pattern.note',
  scoring: 'theme_scales',
  scales: LIFE_THEMES.map((theme) => ({
    id: theme,
    label_key: `instrument.life_pattern.scale.${theme}`,
    description_key: `instrument.life_pattern.scale.${theme}.desc`,
    evidence: 'experimental' as const,
  })),
  items,
};
