/**
 * Generic scoring (Engine layer).
 *
 * Turns keyed, reverse-corrected, weighted responses into scale scores on
 * 0–100 AND a confidence 0–1. Normalization is against the THEORETICAL range of
 * the answered items — this is "scaled, not population-normed": we have no norm
 * sample yet, so a 70 means "70% of the way up the possible range for the items
 * you answered", never "higher than 70% of people". The UI must say so.
 *
 * Confidence combines:
 *   (a) coverage   — proportion of a scale's items answered,
 *   (b) consistency — agreement between items keyed to the same scale,
 *   (c) penalties  — straight-lining and implausibly fast completion.
 *
 * Pure TypeScript. Deterministic. No React, no network.
 */

import type { EvidenceLabel } from '@/core/graph/schema';
import type { InstrumentDef, ItemDef, ItemResponse, ScaleResult } from './types';

/** Number of scale points for a Likert format. */
export function likertPoints(format: ItemDef['format']): number {
  if (format === 'likert5') return 5;
  if (format === 'likert7') return 7;
  return 0;
}

/**
 * Normalize a Likert answer to the unit interval [0,1] along its scale,
 * applying reverse-keying. A midpoint answer maps to 0.5.
 */
export function normalizeLikert(value: number, points: number, reverse: boolean): number {
  const clamped = Math.min(Math.max(value, 1), points);
  const unit = (clamped - 1) / (points - 1); // 0..1
  return reverse ? 1 - unit : unit;
}

/** Threshold (ms) below which a response is considered implausibly fast. */
export const FAST_RESPONSE_MS = 600;

interface ScaleAccumulator {
  /** Weighted sum of normalized contributions (0..1 each). */
  weightedSum: number;
  /** Sum of weights for answered items. */
  weightTotal: number;
  /** Normalized unit values (0..1) for consistency analysis. */
  units: number[];
  /** Count of answered items keying this scale. */
  answered: number;
  /** Count of planned items keying this scale (full bank). */
  planned: number;
  evidence: EvidenceLabel;
}

/**
 * Score every scale of an instrument from a set of responses. Returns one
 * ScaleResult per scale; scales with zero answered items are omitted (callers
 * treat missing scales as "unlit", never zero).
 */
export function scoreInstrumentScales(
  instrument: InstrumentDef,
  responses: ItemResponse[],
): { scales: ScaleResult[]; speedPenalty: number } {
  const byId = new Map(responses.map((r) => [r.item_id, r]));
  const acc = new Map<string, ScaleAccumulator>();

  const ensure = (scaleId: string, evidence: EvidenceLabel): ScaleAccumulator => {
    let a = acc.get(scaleId);
    if (!a) {
      a = { weightedSum: 0, weightTotal: 0, units: [], answered: 0, planned: 0, evidence };
      acc.set(scaleId, a);
    }
    return a;
  };

  // Seed accumulators + count planned items per scale across the full bank.
  for (const scale of instrument.scales) ensure(scale.id, scale.evidence);
  for (const item of instrument.items) {
    for (const k of item.keying) {
      const a = ensure(k.scale, scaleEvidence(instrument, k.scale));
      a.planned += 1;
    }
  }

  // Speed penalty: fraction of timed responses that are implausibly fast.
  let timed = 0;
  let fast = 0;

  // Accumulate answered contributions.
  for (const item of instrument.items) {
    const resp = byId.get(item.id);
    if (!resp) continue;

    if (typeof resp.rt_ms === 'number') {
      timed += 1;
      if (resp.rt_ms < FAST_RESPONSE_MS) fast += 1;
    }

    for (const k of item.keying) {
      const a = ensure(k.scale, scaleEvidence(instrument, k.scale));
      const unit = itemContributionUnit(item, k, resp);
      if (unit === null) continue;
      a.weightedSum += unit * k.weight;
      a.weightTotal += k.weight;
      a.units.push(unit);
      a.answered += 1;
    }
  }

  const speedPenalty = timed > 0 ? fast / timed : 0;

  const scales: ScaleResult[] = [];
  for (const scale of instrument.scales) {
    const a = acc.get(scale.id);
    if (!a || a.answered === 0) continue; // unlit — omit

    // Scaled value: weighted mean of unit contributions → 0..100.
    const mean = a.weightedSum / a.weightTotal;
    const value = round2(mean * 100);

    scales.push({
      scale: scale.id,
      value,
      confidence: round4(
        scaleConfidence({
          coverage: a.planned > 0 ? a.answered / a.planned : 0,
          consistency: consistency(a.units),
          speedPenalty,
        }),
      ),
      evidence: a.evidence,
      answered: a.answered,
      planned: a.planned,
    });
  }

  return { scales, speedPenalty };
}

function scaleEvidence(instrument: InstrumentDef, scaleId: string): EvidenceLabel {
  return instrument.scales.find((s) => s.id === scaleId)?.evidence ?? instrument.evidence;
}

/**
 * Convert one item response into a unit contribution (0..1) for a given keying,
 * or null if the response does not apply to this keying.
 */
function itemContributionUnit(item: ItemDef, k: ItemDef['keying'][number], resp: ItemResponse): number | null {
  switch (item.format) {
    case 'likert5':
    case 'likert7': {
      if (typeof resp.value !== 'number') return null;
      return normalizeLikert(resp.value, likertPoints(item.format), Boolean(k.reverse));
    }
    case 'forced_choice': {
      if (resp.value !== 'A' && resp.value !== 'B') return null;
      // The keying's `pole` is the choice that counts fully towards this scale.
      return resp.value === k.pole ? 1 : 0;
    }
    case 'ranked_choice': {
      if (!Array.isArray(resp.value) || !k.option) return null;
      const idx = resp.value.indexOf(k.option);
      if (idx < 0) return null;
      // Best rank (index 0) → 1, worst → 0.
      const n = resp.value.length;
      return n <= 1 ? 1 : 1 - idx / (n - 1);
    }
    default:
      return null;
  }
}

/**
 * Consistency score (0..1) for a set of unit values on the same scale. High
 * when items agree (low variance), low when they contradict. A single item is
 * treated as moderately consistent (0.75) — we cannot verify agreement with one.
 */
export function consistency(units: number[]): number {
  if (units.length <= 1) return units.length === 1 ? 0.75 : 0;
  const mean = units.reduce((s, u) => s + u, 0) / units.length;
  const variance = units.reduce((s, u) => s + (u - mean) ** 2, 0) / units.length;
  // Max variance for values in [0,1] is 0.25 (half at 0, half at 1).
  return clamp01(1 - variance / 0.25);
}

/**
 * Straight-lining penalty (0..1, higher = more suspicious): all identical
 * answers across many Likert items suggests disengagement.
 */
export function straightLiningPenalty(responses: ItemResponse[]): number {
  const numeric = responses.map((r) => r.value).filter((v): v is number => typeof v === 'number');
  if (numeric.length < 5) return 0;
  const first = numeric[0];
  const allSame = numeric.every((v) => v === first);
  return allSame ? 1 : 0;
}

interface ConfidenceInputs {
  coverage: number; // 0..1
  consistency: number; // 0..1
  speedPenalty: number; // 0..1
}

/**
 * Combine confidence inputs. Coverage and consistency are the positive signal;
 * the speed penalty subtracts. Weights are deliberate and documented here.
 */
export function scaleConfidence({ coverage, consistency, speedPenalty }: ConfidenceInputs): number {
  const base = 0.6 * coverage + 0.4 * consistency;
  const penalized = base * (1 - 0.5 * clamp01(speedPenalty));
  return clamp01(penalized);
}

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

export function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}
