/**
 * Engine types (Engine layer).
 *
 * Instruments are DATA: versioned definitions with scales, items and a scoring
 * block. Item text lives in i18n files (referenced by key), never inline in
 * code. See docs/ARCHITECTURE.md §1 and the Phase I instrument spec.
 *
 * Pure TypeScript. No React, no network.
 */

import type { EvidenceLabel, FacetKey } from '@/core/graph/schema';

/* ------------------------------ response model ----------------------------- */

/** How an item is answered. */
export type ResponseFormat = 'likert5' | 'likert7' | 'forced_choice' | 'ranked_choice';

/**
 * A single raw response to an item. The engine never sees item text — only the
 * item id and the chosen value(s), plus optional timing for speed penalties.
 */
export interface ItemResponse {
  item_id: string;
  /**
   * The answer:
   * - likert5 / likert7: an integer position (1..5 or 1..7)
   * - forced_choice: 'A' | 'B' (which pole of the pair was chosen)
   * - ranked_choice: an ordered array of option ids (best→worst)
   */
  value: number | 'A' | 'B' | string[];
  /** Response time in milliseconds, if recorded. Used for speed penalties. */
  rt_ms?: number;
}

/** A keyed set of responses for a single assessment run. */
export interface ResponseSet {
  /** All item responses, keyed by item id. Order does not affect scoring. */
  responses: ItemResponse[];
  /** Optional birth date (YYYY-MM-DD) — used only by Life Pattern numerology. */
  birth_date?: string;
}

/* ----------------------------- instrument model ---------------------------- */

/** A scale an instrument measures. */
export interface ScaleDef {
  id: string;
  /** i18n key for the scale's display label. */
  label_key: string;
  /** i18n key for the scale's description. */
  description_key: string;
  /** Evidence label for this specific scale. */
  evidence: EvidenceLabel;
}

/**
 * How a response maps onto one scale. A single item may contribute to several
 * scales (e.g. a forced-choice pair pushes one pole up relative to the other).
 */
export interface ItemKeying {
  /** The scale this keying affects. */
  scale: string;
  /**
   * Contribution weight (positive). Combined with the normalized item value.
   */
  weight: number;
  /**
   * For Likert items: if true, the item is reverse-scored (a high answer
   * lowers the scale). For forced_choice: the pole ('A'|'B') that counts
   * TOWARDS this scale. For ranked_choice: the option id that maps to this scale.
   */
  reverse?: boolean;
  pole?: 'A' | 'B';
  option?: string;
}

/** A single assessment item. Its text lives in i18n under `prompt_key`. */
export interface ItemDef {
  id: string;
  /** i18n key for the item prompt. */
  prompt_key: string;
  format: ResponseFormat;
  /** For forced_choice: i18n keys for the two poles. */
  option_keys?: { A: string; B: string };
  /** For ranked_choice: option ids + their i18n label keys. */
  options?: { id: string; label_key: string }[];
  /** Which scale(s) this item keys, and how. */
  keying: ItemKeying[];
  /** Whether this item is part of the 15-item demo subset. */
  demo: boolean;
}

/** How an instrument turns scale scores into its facet-specific extras. */
export type ScoringStrategy =
  | 'continuous_axes' // Jungian: bipolar axes + clarity
  | 'type_weights' // Enneagram: per-type weights + dominant/wing
  | 'theme_scales'; // Life Pattern: independent theme scales

/** A complete, versioned instrument definition. */
export interface InstrumentDef {
  id: string;
  version: string;
  /** The facet this instrument fills. */
  facet: Exclude<FacetKey, 'identity' | 'soulgraph_core'>;
  /** Instrument-level evidence label. */
  evidence: EvidenceLabel;
  /** i18n key for the instrument's display name. */
  name_key: string;
  /** i18n key for an honest one-line note (e.g. experimental caveats). */
  note_key?: string;
  scales: ScaleDef[];
  items: ItemDef[];
  scoring: ScoringStrategy;
  /**
   * For continuous_axes: the pairing of scales into bipolar axes, with the
   * four-letter convenience code letters for each pole.
   */
  axes?: {
    id: string;
    /** Scale pushed towards the "high" end. */
    positive_scale: string;
    /** Scale pushed towards the "low" end. */
    negative_scale: string;
    /** Convenience-code letter when the axis leans positive / negative. */
    code_positive: string;
    code_negative: string;
  }[];
}

/* ------------------------------- result model ------------------------------ */

/** A scored scale, pre-envelope (value 0–100, confidence 0–1). */
export interface ScaleResult {
  scale: string;
  value: number;
  confidence: number;
  evidence: EvidenceLabel;
  /** Number of items answered that key this scale. */
  answered: number;
  /** Number of items in the full bank that key this scale. */
  planned: number;
}

/** The scored output of one instrument. */
export interface InstrumentResult {
  instrument_id: string;
  instrument_version: string;
  engine_version: string;
  evidence: EvidenceLabel;
  scales: ScaleResult[];
  /** Instrument-level confidence (mean of scale confidences, coverage-weighted). */
  confidence: number;
  /** Strategy-specific extras (e.g. type_code, dominant_type, wing, margins). */
  extras: Record<string, unknown>;
}
