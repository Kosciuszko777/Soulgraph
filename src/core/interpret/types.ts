/**
 * Interpretation layer — types (Interpretation layer).
 *
 * Deterministic, rule-based interpretation of a canonical SoulGraph. The engine
 * produces numbers; this layer turns numbers into careful, hedged language —
 * never verdicts, never certainty (docs/SOULGRAPH.md "Ethical boundaries").
 *
 * Interpretation OUTPUTS reference i18n keys rather than literal strings, so the
 * same rules produce English and Swiss-German. Rules live here; words live in
 * src/i18n. Phase II will add SoulAI on top of this same interface.
 *
 * Pure TypeScript. No React imports.
 */

import type { EvidenceLabel } from '@/core/graph/schema';

/** A single interpretive statement, with its evidence label and strength. */
export interface Insight {
  /** i18n key for the statement text. */
  key: string;
  /** Evidence label gating how strongly it may be read. */
  evidence: EvidenceLabel;
  /**
   * How pronounced the underlying signal is (0–1). Low strength MUST be
   * presented tentatively ("a slight lean"), never as a defining trait.
   */
  strength: number;
}

/** A dedicated interpretation of one instrument/facet. */
export interface FacetInterpretation {
  facet: string;
  evidence: EvidenceLabel;
  /** i18n key: what this framework is, in one or two sentences. */
  framework_key: string;
  /** i18n key: how much empirical support it has (honest). */
  standing_key: string;
  /** Ordered interpretive statements for the user's specific pattern. */
  insights: Insight[];
  /**
   * Whether the pattern is too close to call (e.g. Enneagram top-two margin).
   * When true the UI must decline to name a single type.
   */
  inconclusive?: boolean;
}

/**
 * A cross-framework tension, framed as a QUESTION to sit with — never a verdict
 * or a contradiction to "resolve". These are the most interesting part of a
 * SoulGraph and the most easily abused, so they are always questions.
 */
export interface Tension {
  /** i18n key for the question. */
  key: string;
  /** The facets involved (for labelling). */
  facets: string[];
  /** Combined strength of the tension (0–1); used only for ordering. */
  strength: number;
}

/** The full interpretation of a SoulGraph version. */
export interface GraphInterpretation {
  facets: FacetInterpretation[];
  tensions: Tension[];
  /** Up to four short "headline" insights for the one-pager / share surfaces. */
  highlights: Insight[];
}
