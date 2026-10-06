/**
 * Graph assembly (Engine layer).
 *
 * buildSoulGraph(input, previousVersion?) → SoulGraphVersion, producing the
 * canonical schema from docs/ARCHITECTURE.md §2. Deterministic: the same input
 * always yields the same scores and the same provenance hash.
 *
 * The LLM never scores anything — this function does. Demo items are a strict
 * subset of the full banks, so demo answers carry into the complete assessment
 * and are never asked twice.
 *
 * Pure TypeScript. No React, no network.
 */

import {
  SOULGRAPH_VERSION,
  type SoulGraph,
  type SoulGraphVersion,
  type ScaleValue,
  type ScaleMap,
  type JungFacet,
  type EnneagramFacet,
  type LifePatternFacet,
  type SoulGraphCoreFacet,
} from '@/core/graph/schema';
import { ENGINE_VERSION } from './version';
import { hashResponses } from './hash';
import { scoreInstrumentScales } from './scoring';
import { INSTRUMENTS } from './instruments';
import { jungInstrument } from './instruments/jung';
import { enneagramInstrument, ENNEAGRAM_CLEAR_MARGIN } from './instruments/enneagram';
import { lifePatternInstrument } from './instruments/lifePattern';
import { numerologyThemeContributions, lifePathNumber } from './numerology';
import { computeCompletion } from './completion';
import {
  computeCore,
  CORE_DIMENSIONS,
  type CoreInputs,
} from './core-mapping';
import type { InstrumentDef, InstrumentResult, ResponseSet, ScaleResult } from './types';

export interface BuildOptions {
  /** Owner pubkey (hex) for the identity facet. */
  pubkey: string;
  display_name?: string;
  /** Opaque id of this assessment run. */
  assessment_run_id: string;
  /** Version id for the new immutable snapshot. */
  version_id: string;
  /** Unix seconds; defaults to now (pass explicitly for deterministic tests). */
  created_at?: number;
}

/** Build the result object for a single instrument (value + confidence + extras). */
export function scoreInstrument(instrument: InstrumentDef, set: ResponseSet): InstrumentResult {
  const { scales } = scoreInstrumentScales(instrument, set.responses);

  const extras: Record<string, unknown> = {};

  if (instrument.scoring === 'type_weights') {
    Object.assign(extras, enneagramExtras(scales));
  } else if (instrument.scoring === 'continuous_axes') {
    Object.assign(extras, jungExtras(instrument, scales));
  }

  // Instrument confidence: coverage-weighted mean of scale confidences.
  const totalAnswered = scales.reduce((s, sc) => s + sc.answered, 0);
  const confidence =
    totalAnswered > 0
      ? scales.reduce((s, sc) => s + sc.confidence * sc.answered, 0) / totalAnswered
      : 0;

  return {
    instrument_id: instrument.id,
    instrument_version: instrument.version,
    engine_version: ENGINE_VERSION,
    evidence: instrument.evidence,
    scales,
    confidence: Math.round(confidence * 10000) / 10000,
    extras,
  };
}

/** Jungian extras: four-letter convenience code + per-axis clarity. */
function jungExtras(instrument: InstrumentDef, scales: ScaleResult[]): Record<string, unknown> {
  const byScale = new Map(scales.map((s) => [s.scale, s]));
  let code = '';
  const clarity: Record<string, number> = {};
  for (const axis of instrument.axes ?? []) {
    const s = byScale.get(axis.positive_scale);
    if (!s) {
      code += '?';
      continue;
    }
    code += s.value >= 50 ? axis.code_positive : axis.code_negative;
    // Clarity = distance from the 50 midpoint, scaled to 0–100.
    clarity[axis.id] = Math.round(Math.abs(s.value - 50) * 2 * 100) / 100;
  }
  return { type_code: code.includes('?') ? undefined : code, clarity };
}

/** Enneagram extras: dominant type, wing, top-two margin, clarity flag. */
function enneagramExtras(scales: ScaleResult[]): Record<string, unknown> {
  if (scales.length === 0) return {};
  const sorted = [...scales].sort((a, b) => b.value - a.value);
  const top = sorted[0];
  const second = sorted[1];
  const dominant = Number(top.scale);
  const margin = second ? Math.round((top.value - second.value) * 100) / 100 : 100;
  const marginClear = margin >= ENNEAGRAM_CLEAR_MARGIN;

  // Wing: the higher-scoring of the two adjacent types (1..9 wraps 9↔1).
  const left = dominant === 1 ? 9 : dominant - 1;
  const right = dominant === 9 ? 1 : dominant + 1;
  const scoreOf = (t: number) => scales.find((s) => s.scale === String(t))?.value ?? -1;
  const wing = scoreOf(left) >= scoreOf(right) ? left : right;

  return {
    dominant_type: marginClear ? dominant : undefined,
    wing: marginClear ? wing : undefined,
    margin,
    margin_clear: marginClear,
  };
}

/** Convert ScaleResults into a ScaleMap of ScaleValue envelopes. */
function toScaleMap(result: InstrumentResult): ScaleMap {
  const map: ScaleMap = {};
  for (const sc of result.scales) {
    const value: ScaleValue = {
      value: sc.value,
      confidence: sc.confidence,
      evidence: sc.evidence,
      instrument_id: result.instrument_id,
      instrument_version: result.instrument_version,
      engine_version: ENGINE_VERSION,
    };
    map[sc.scale] = value;
  }
  return map;
}

/** Assemble the canonical SoulGraph and wrap it in an immutable version. */
export function buildSoulGraph(
  set: ResponseSet,
  options: BuildOptions,
  previousVersion?: SoulGraphVersion,
): SoulGraphVersion {
  const created_at = options.created_at ?? Math.floor(Date.now() / 1000);

  // Score each implemented instrument against the responses.
  const results = new Map<string, InstrumentResult>();
  for (const instrument of INSTRUMENTS) {
    const result = scoreInstrument(instrument, set);
    if (result.scales.length > 0) results.set(instrument.id, result);
  }

  const jungResult = results.get(jungInstrument.id);
  const enneagramResult = results.get(enneagramInstrument.id);
  const lifeResult = results.get(lifePatternInstrument.id);

  // --- Facets (null when no items answered for that instrument) ---
  const jung: JungFacet | null = jungResult
    ? {
        scales: toScaleMap(jungResult),
        type_code: jungResult.extras.type_code as string | undefined,
      }
    : null;

  const enneagram: EnneagramFacet | null = enneagramResult
    ? {
        scales: toScaleMap(enneagramResult),
        dominant_type: enneagramResult.extras.dominant_type as number | undefined,
        wing: enneagramResult.extras.wing as number | undefined,
      }
    : null;

  const life_pattern: LifePatternFacet | null = lifeResult
    ? {
        scales: toScaleMap(lifeResult),
      }
    : null;

  // Numerology: blend birth-date contributions INTO the life_pattern scales as
  // an experimental lens, only when a birth date is supplied. Stored inside the
  // facet; the birth date itself is never placed on the graph in cleartext.
  if (life_pattern) {
    const numerology = numerologyThemeContributions(set.birth_date);
    if (numerology) {
      for (const [theme, lensValue] of Object.entries(numerology)) {
        const existing = life_pattern.scales[theme];
        if (existing) {
          // 70% reflective items + 30% numerological lens (experimental).
          existing.value = Math.round((existing.value * 0.7 + lensValue * 0.3) * 100) / 100;
        }
      }
      const root = lifePathNumber(set.birth_date!);
      if (root !== null) life_pattern.pattern_code = String(root);
    }
  }

  // --- SoulGraph Core (always experimental; unlit dims stay null) ---
  const coreInputs: CoreInputs = { values: {} };
  for (const [instrumentId, result] of results) {
    for (const sc of result.scales) {
      coreInputs.values[`${instrumentId}.${sc.scale}`] = {
        value: sc.value,
        confidence: sc.confidence,
      };
    }
  }
  const core = computeCore(coreInputs);
  const coreScales: ScaleMap = {};
  for (const dim of CORE_DIMENSIONS) {
    const r = core[dim];
    if (r.value === null) continue; // unlit — omit (never zero)
    coreScales[dim] = {
      value: r.value,
      confidence: r.confidence,
      evidence: 'experimental', // Core is ALWAYS experimental
      instrument_id: 'soulgraph_core',
      instrument_version: '1.0.0',
      engine_version: ENGINE_VERSION,
    };
  }
  const soulgraph_core: SoulGraphCoreFacet | null =
    Object.keys(coreScales).length > 0 ? { scales: coreScales } : null;

  // --- Confidence summary ---
  const per_facet: Record<string, number> = {};
  if (jungResult) per_facet.jung = jungResult.confidence;
  if (enneagramResult) per_facet.enneagram = enneagramResult.confidence;
  if (lifeResult) per_facet.life_pattern = lifeResult.confidence;
  if (soulgraph_core) {
    const vals = Object.values(coreScales).map((v) => v.confidence);
    per_facet.soulgraph_core = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  }
  const overall = computeCompletion(set.responses);

  const graph: SoulGraph = {
    soulgraph_version: SOULGRAPH_VERSION,
    identity: { pubkey: options.pubkey, display_name: options.display_name },
    jung,
    ocean: null,
    enneagram,
    human_design: null,
    life_pattern,
    worldview: null,
    soulgraph_core,
    confidence: {
      overall: Math.round(overall * 10000) / 10000,
      per_facet,
    },
    provenance: {
      responses_hash: hashResponses(set),
      engine_version: ENGINE_VERSION,
      instrument_versions: Object.fromEntries(
        INSTRUMENTS.map((i) => [i.id, i.version]),
      ),
      assessment_run_id: options.assessment_run_id,
    },
    created_at,
  };

  return {
    version_id: options.version_id,
    sequence: previousVersion ? previousVersion.sequence + 1 : 0,
    graph,
  };
}
