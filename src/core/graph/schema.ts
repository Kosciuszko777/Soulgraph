/**
 * SoulGraph — canonical graph schema (Graph layer).
 *
 * PURE TypeScript. No React imports. Must run unchanged in Node and in a Web
 * Worker for re-scoring. See docs/ARCHITECTURE.md §2–§3.
 *
 * The canonical SoulGraph is a versioned, immutable snapshot. Every facet is
 * independently nullable; Phase I fills only `jung`, `enneagram`, `life_pattern`
 * and a partial `soulgraph_core`. Every scale value carries its own confidence,
 * evidence label and instrument/engine provenance.
 */

import { z } from "zod";

/** Current canonical schema version. Bump only on breaking shape changes. */
export const SOULGRAPH_VERSION = "1.0" as const;

/**
 * The three — and only three — evidence labels. Every insight and every scale
 * value must carry exactly one. See docs/SOULGRAPH.md "Ethical boundaries".
 *
 * - psychometric:  constructs with substantial empirical support (e.g. Big Five).
 * - interpretive:  established interpretive traditions (e.g. Jungian, Enneagram).
 * - experimental:  proprietary/speculative (Life Pattern, Human Design, Core).
 */
export const EvidenceLabel = z.enum([
  "psychometric",
  "interpretive",
  "experimental",
]);
export type EvidenceLabel = z.infer<typeof EvidenceLabel>;

/**
 * A single measured scale value. This envelope is the atomic unit of the graph:
 * a number plus everything needed to trust it and to re-derive it later.
 */
export const ScaleValueSchema = z.object({
  /** 0–100. The scaled construct value. */
  value: z.number().min(0).max(100),
  /** 0–1. How much the engine trusts this value given the responses. */
  confidence: z.number().min(0).max(1),
  /** Evidence label that gates how this value may be presented. */
  evidence: EvidenceLabel,
  /** Identifier of the instrument that produced this value. */
  instrument_id: z.string(),
  /** Version of that instrument. */
  instrument_version: z.string(),
  /** Version of the scoring engine that computed this value. */
  engine_version: z.string(),
});
export type ScaleValue = z.infer<typeof ScaleValueSchema>;

/** A named map of scale values (e.g. OCEAN's five dimensions). */
const ScaleMap = z.record(z.string(), ScaleValueSchema);
export type ScaleMap = z.infer<typeof ScaleMap>;

/* -------------------------------------------------------------------------- */
/* Facets                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Identity facet. Deliberately minimal: ONLY the owner's pubkey and an optional
 * display name. NEVER legal name, phone, or address. See docs/ARCHITECTURE.md §2.
 */
export const IdentityFacetSchema = z.object({
  pubkey: z.string().regex(/^[0-9a-f]{64}$/, "expected 64-char hex pubkey"),
  display_name: z.string().max(80).optional(),
});
export type IdentityFacet = z.infer<typeof IdentityFacetSchema>;

/** Jungian typology (interpretive). Four dichotomies + derived type code. */
export const JungFacetSchema = z.object({
  /** Dichotomy poles as 0–100 scales (e.g. 70 on E means more extraverted). */
  scales: ScaleMap,
  /** Derived 4-letter code, e.g. "INTJ". Optional until computed. */
  type_code: z.string().length(4).optional(),
});
export type JungFacet = z.infer<typeof JungFacetSchema>;

/** Big Five / OCEAN (psychometric). Five dimensions, each 0–100. */
export const OceanFacetSchema = z.object({
  scales: ScaleMap,
});
export type OceanFacet = z.infer<typeof OceanFacetSchema>;

/** Enneagram (interpretive). Nine type weights + optional dominant/wing. */
export const EnneagramFacetSchema = z.object({
  /** Weights for types 1–9 as 0–100 scales keyed "1".."9". */
  scales: ScaleMap,
  dominant_type: z.number().int().min(1).max(9).optional(),
  wing: z.number().int().min(1).max(9).optional(),
});
export type EnneagramFacet = z.infer<typeof EnneagramFacetSchema>;

/** Human Design (experimental). Stored as scales + opaque chart fields. */
export const HumanDesignFacetSchema = z.object({
  scales: ScaleMap,
  type: z.string().optional(),
  authority: z.string().optional(),
});
export type HumanDesignFacet = z.infer<typeof HumanDesignFacetSchema>;

/** Life Pattern (experimental SoulGraph). Proprietary pattern scales. */
export const LifePatternFacetSchema = z.object({
  scales: ScaleMap,
  pattern_code: z.string().optional(),
});
export type LifePatternFacet = z.infer<typeof LifePatternFacetSchema>;

/** Worldview / values (interpretive). Values and orientation scales. */
export const WorldviewFacetSchema = z.object({
  scales: ScaleMap,
});
export type WorldviewFacet = z.infer<typeof WorldviewFacetSchema>;

/**
 * SoulGraph Core (experimental). Proprietary composites across the other
 * facets. Also exposes a coarse, shareable aggregate vector that is its OWN
 * facet concept — sharing it never requires sharing raw facets (see
 * docs/ARCHITECTURE.md §4).
 */
export const SoulGraphCoreFacetSchema = z.object({
  scales: ScaleMap,
  /** Coarse vector safe to share in aggregate (e.g. for team aggregation). */
  aggregate_vector: z.array(z.number().min(0).max(100)).optional(),
});
export type SoulGraphCoreFacet = z.infer<typeof SoulGraphCoreFacetSchema>;

/** Canonical facet keys, in presentation order. */
export const FACET_KEYS = [
  "identity",
  "jung",
  "ocean",
  "enneagram",
  "human_design",
  "life_pattern",
  "worldview",
  "soulgraph_core",
] as const;
export type FacetKey = (typeof FACET_KEYS)[number];

/* -------------------------------------------------------------------------- */
/* Provenance & confidence                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Provenance: everything needed to deterministically re-score this graph later.
 * We store the HASH of the raw responses (not the responses themselves) plus the
 * engine version. The responses live in the vault.
 */
export const ProvenanceSchema = z.object({
  /** Hash (hex) of the canonicalized raw responses that produced this graph. */
  responses_hash: z.string().regex(/^[0-9a-f]{64}$/),
  /** Engine version used for this snapshot. */
  engine_version: z.string(),
  /** Instrument versions in effect, keyed by instrument id. */
  instrument_versions: z.record(z.string(), z.string()),
  /** Opaque id of the assessment run that produced this graph. */
  assessment_run_id: z.string(),
});
export type Provenance = z.infer<typeof ProvenanceSchema>;

/** Overall confidence summary for quick display (never presented as certainty). */
export const ConfidenceSchema = z.object({
  /** 0–1 overall confidence across filled facets. */
  overall: z.number().min(0).max(1),
  /** Per-facet 0–1 confidence, keyed by FacetKey. */
  per_facet: z.record(z.string(), z.number().min(0).max(1)),
});
export type Confidence = z.infer<typeof ConfidenceSchema>;

/* -------------------------------------------------------------------------- */
/* Canonical SoulGraph (one immutable version)                                */
/* -------------------------------------------------------------------------- */

export const SoulGraphSchema = z.object({
  soulgraph_version: z.literal(SOULGRAPH_VERSION),

  /** Facets. Every facet is independently nullable. */
  identity: IdentityFacetSchema,
  jung: JungFacetSchema.nullable(),
  ocean: OceanFacetSchema.nullable(),
  enneagram: EnneagramFacetSchema.nullable(),
  human_design: HumanDesignFacetSchema.nullable(),
  life_pattern: LifePatternFacetSchema.nullable(),
  worldview: WorldviewFacetSchema.nullable(),
  soulgraph_core: SoulGraphCoreFacetSchema.nullable(),

  confidence: ConfidenceSchema,
  provenance: ProvenanceSchema,

  /** Unix seconds when this immutable version was created. */
  created_at: z.number().int().nonnegative(),
});
export type SoulGraph = z.infer<typeof SoulGraphSchema>;

/**
 * An immutable, identified version of a SoulGraph. Versions are never
 * overwritten; a new one is created on each assessment completion or re-take.
 */
export const SoulGraphVersionSchema = z.object({
  /** Opaque version id (random; not derived from content order). */
  version_id: z.string(),
  /** Monotonic sequence number for ordering within an owner's history. */
  sequence: z.number().int().nonnegative(),
  /** The canonical graph for this version. */
  graph: SoulGraphSchema,
});
export type SoulGraphVersion = z.infer<typeof SoulGraphVersionSchema>;

/**
 * The owner's SoulGraph history: the immutable versions plus a pointer to the
 * current one. The "current" SoulGraph is always a pointer, never a mutation.
 */
export const SoulGraphHistorySchema = z.object({
  owner_pubkey: z.string().regex(/^[0-9a-f]{64}$/),
  current_version_id: z.string().nullable(),
  versions: z.array(SoulGraphVersionSchema),
});
export type SoulGraphHistory = z.infer<typeof SoulGraphHistorySchema>;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Return the current version from a history, or null if none is set. */
export function currentVersion(
  history: SoulGraphHistory,
): SoulGraphVersion | null {
  if (!history.current_version_id) return null;
  return (
    history.versions.find(
      (v) => v.version_id === history.current_version_id,
    ) ?? null
  );
}

/** Parse + validate an unknown value as a SoulGraph, throwing on failure. */
export function parseSoulGraph(input: unknown): SoulGraph {
  return SoulGraphSchema.parse(input);
}

/** Build an empty SoulGraph for an owner — all facets null. */
export function emptySoulGraph(
  pubkey: string,
  provenance: Provenance,
  created_at: number,
  display_name?: string,
): SoulGraph {
  return {
    soulgraph_version: SOULGRAPH_VERSION,
    identity: { pubkey, display_name },
    jung: null,
    ocean: null,
    enneagram: null,
    human_design: null,
    life_pattern: null,
    worldview: null,
    soulgraph_core: null,
    confidence: { overall: 0, per_facet: {} },
    provenance,
    created_at,
  };
}
