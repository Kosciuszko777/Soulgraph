/**
 * SoulGraph Core mapping (Engine layer).
 *
 * The sixteen Core dimensions are weighted combinations of instrument scales,
 * defined in a configuration matrix where EACH contribution carries its own
 * weight and evidence label. Core values are ALWAYS labelled Experimental
 * SoulGraph (a composite is only as grounded as its inputs, and the
 * combination itself is proprietary/speculative).
 *
 * A dimension with no contributing inputs that were actually answered is
 * "unlit" — null, never zero. The matrix already contains placeholder slots for
 * OCEAN, Worldview and Human Design so Phase II only adds their data.
 *
 * Pure TypeScript. Deterministic. See docs/ARCHITECTURE.md §2.
 */

import type { EvidenceLabel } from '@/core/graph/schema';

/** The sixteen Core dimensions, in canonical order. */
export const CORE_DIMENSIONS = [
  'autonomy',
  'analytical_orientation',
  'emotional_sensitivity',
  'social_energy',
  'exploration',
  'structure',
  'risk_tolerance',
  'harmony',
  'assertiveness',
  'meaning_orientation',
  'stability',
  'adaptability',
  'novelty_seeking',
  'cooperation',
  'dominance',
  'introspection',
] as const;
export type CoreDimension = (typeof CORE_DIMENSIONS)[number];

/**
 * A single contribution to a Core dimension: a source instrument scale, a
 * weight (may be negative to subtract), and the evidence label of the input.
 * `invert` applies 100 − value before weighting (for poles like introversion).
 */
export interface CoreContribution {
  /** Source key `${instrumentId}.${scaleId}`. */
  source: string;
  weight: number;
  evidence: EvidenceLabel;
  invert?: boolean;
}

/**
 * The Core matrix: each dimension → its contributions. Phase I inputs come from
 * jung, enneagram and life_pattern. OCEAN / Worldview / Human Design slots are
 * present but reference scales no instrument produces yet, so they contribute
 * nothing until Phase II supplies the data (and never silently become zero).
 */
export const CORE_MATRIX: Record<CoreDimension, CoreContribution[]> = {
  autonomy: [
    { source: 'life_pattern.independence', weight: 1, evidence: 'experimental' },
    { source: 'enneagram.8', weight: 0.5, evidence: 'interpretive' },
    { source: 'enneagram.5', weight: 0.4, evidence: 'interpretive' },
    { source: 'ocean.A', weight: -0.3, evidence: 'psychometric' }, // placeholder
  ],
  analytical_orientation: [
    { source: 'jung.judgment', weight: 1, evidence: 'interpretive' }, // high = thinking
    { source: 'enneagram.5', weight: 0.6, evidence: 'interpretive' },
    { source: 'ocean.O', weight: 0.3, evidence: 'psychometric' }, // placeholder
  ],
  emotional_sensitivity: [
    { source: 'jung.judgment', weight: 1, evidence: 'interpretive', invert: true }, // low = feeling
    { source: 'enneagram.4', weight: 0.6, evidence: 'interpretive' },
    { source: 'ocean.N', weight: 0.4, evidence: 'psychometric' }, // placeholder
  ],
  social_energy: [
    { source: 'jung.energy', weight: 1, evidence: 'interpretive' }, // high = extraverted
    { source: 'enneagram.7', weight: 0.4, evidence: 'interpretive' },
    { source: 'ocean.E', weight: 0.5, evidence: 'psychometric' }, // placeholder
  ],
  exploration: [
    { source: 'jung.perception', weight: 1, evidence: 'interpretive', invert: true }, // low = intuition
    { source: 'life_pattern.transformation', weight: 0.5, evidence: 'experimental' },
    { source: 'ocean.O', weight: 0.5, evidence: 'psychometric' }, // placeholder
  ],
  structure: [
    { source: 'jung.lifestyle', weight: 1, evidence: 'interpretive' }, // high = judging
    { source: 'life_pattern.discipline', weight: 0.7, evidence: 'experimental' },
    { source: 'enneagram.1', weight: 0.5, evidence: 'interpretive' },
    { source: 'ocean.C', weight: 0.5, evidence: 'psychometric' }, // placeholder
  ],
  risk_tolerance: [
    { source: 'enneagram.7', weight: 0.6, evidence: 'interpretive' },
    { source: 'enneagram.8', weight: 0.5, evidence: 'interpretive' },
    { source: 'life_pattern.transformation', weight: 0.5, evidence: 'experimental' },
    { source: 'life_pattern.discipline', weight: -0.3, evidence: 'experimental' },
  ],
  harmony: [
    { source: 'enneagram.9', weight: 0.8, evidence: 'interpretive' },
    { source: 'enneagram.2', weight: 0.4, evidence: 'interpretive' },
    { source: 'jung.judgment', weight: 0.5, evidence: 'interpretive', invert: true }, // feeling
    { source: 'ocean.A', weight: 0.5, evidence: 'psychometric' }, // placeholder
  ],
  assertiveness: [
    { source: 'enneagram.8', weight: 0.9, evidence: 'interpretive' },
    { source: 'enneagram.3', weight: 0.4, evidence: 'interpretive' },
    { source: 'jung.energy', weight: 0.4, evidence: 'interpretive' },
  ],
  meaning_orientation: [
    { source: 'life_pattern.service', weight: 0.7, evidence: 'experimental' },
    { source: 'enneagram.4', weight: 0.4, evidence: 'interpretive' },
    { source: 'enneagram.1', weight: 0.3, evidence: 'interpretive' },
    { source: 'worldview.transcendence', weight: 0.6, evidence: 'interpretive' }, // placeholder
  ],
  stability: [
    { source: 'life_pattern.discipline', weight: 0.6, evidence: 'experimental' },
    { source: 'enneagram.6', weight: 0.4, evidence: 'interpretive' },
    { source: 'ocean.N', weight: -0.6, evidence: 'psychometric' }, // placeholder
  ],
  adaptability: [
    { source: 'jung.lifestyle', weight: 1, evidence: 'interpretive', invert: true }, // perceiving
    { source: 'life_pattern.transformation', weight: 0.5, evidence: 'experimental' },
    { source: 'enneagram.9', weight: 0.3, evidence: 'interpretive' },
  ],
  novelty_seeking: [
    { source: 'jung.perception', weight: 0.7, evidence: 'interpretive', invert: true }, // intuition
    { source: 'enneagram.7', weight: 0.6, evidence: 'interpretive' },
    { source: 'life_pattern.creativity', weight: 0.5, evidence: 'experimental' },
    { source: 'ocean.O', weight: 0.4, evidence: 'psychometric' }, // placeholder
  ],
  cooperation: [
    { source: 'enneagram.2', weight: 0.6, evidence: 'interpretive' },
    { source: 'enneagram.9', weight: 0.5, evidence: 'interpretive' },
    { source: 'life_pattern.service', weight: 0.5, evidence: 'experimental' },
    { source: 'ocean.A', weight: 0.6, evidence: 'psychometric' }, // placeholder
  ],
  dominance: [
    { source: 'enneagram.8', weight: 0.9, evidence: 'interpretive' },
    { source: 'jung.judgment', weight: 0.3, evidence: 'interpretive' }, // thinking
    { source: 'enneagram.9', weight: -0.4, evidence: 'interpretive' },
  ],
  introspection: [
    { source: 'jung.energy', weight: 1, evidence: 'interpretive', invert: true }, // introverted
    { source: 'enneagram.4', weight: 0.5, evidence: 'interpretive' },
    { source: 'enneagram.5', weight: 0.5, evidence: 'interpretive' },
  ],
};

/** A resolved Core dimension value (or unlit). */
export interface CoreResult {
  value: number | null;
  confidence: number;
  /** Evidence is always experimental for Core, but we track input labels. */
  input_evidences: EvidenceLabel[];
  /** Number of contributions that were actually lit (input available). */
  lit_inputs: number;
}

/** A flat map of available instrument-scale values + confidences. */
export interface CoreInputs {
  /** `${instrumentId}.${scaleId}` → { value 0–100, confidence 0–1 }. */
  values: Record<string, { value: number; confidence: number }>;
}

/**
 * Compute all sixteen Core dimensions from available inputs. A dimension whose
 * contributions reference no available input stays `value: null` (unlit).
 */
export function computeCore(inputs: CoreInputs): Record<CoreDimension, CoreResult> {
  const out = {} as Record<CoreDimension, CoreResult>;

  for (const dim of CORE_DIMENSIONS) {
    const contributions = CORE_MATRIX[dim];
    let weightedSum = 0;
    let absWeightTotal = 0;
    let confidenceSum = 0;
    const evidences: EvidenceLabel[] = [];
    let lit = 0;

    for (const c of contributions) {
      const input = inputs.values[c.source];
      if (!input) continue; // unavailable — contributes nothing
      const raw = c.invert ? 100 - input.value : input.value;
      weightedSum += raw * c.weight;
      absWeightTotal += Math.abs(c.weight);
      confidenceSum += input.confidence * Math.abs(c.weight);
      evidences.push(c.evidence);
      lit += 1;
    }

    if (lit === 0 || absWeightTotal === 0) {
      out[dim] = { value: null, confidence: 0, input_evidences: [], lit_inputs: 0 };
      continue;
    }

    // Weighted mean, clamped to 0–100 (negative weights can pull out of range).
    const value = Math.min(100, Math.max(0, weightedSum / absWeightTotal));
    const confidence = confidenceSum / absWeightTotal;

    out[dim] = {
      value: Math.round(value * 100) / 100,
      confidence: Math.round(confidence * 10000) / 10000,
      input_evidences: Array.from(new Set(evidences)),
      lit_inputs: lit,
    };
  }

  return out;
}
