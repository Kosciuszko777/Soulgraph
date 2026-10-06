/**
 * Interpretation layer — rule-based interpreter (Interpretation layer).
 *
 * interpretGraph(graph) → GraphInterpretation. Deterministic: the same graph
 * always yields the same interpretation. Every statement is hedged, carries an
 * evidence label, and is chosen by thresholds — never by an opaque model. The
 * LLM (Phase II) will sit ON TOP of this, never replace the honesty rules here.
 *
 * Pure TypeScript. No React imports.
 */

import type { SoulGraph, ScaleValue } from '@/core/graph/schema';
import { CORE_DIMENSIONS } from '@/core/engine/core-mapping';
import type {
  FacetInterpretation,
  GraphInterpretation,
  Insight,
  Tension,
} from './types';

/** Distance from the neutral midpoint, 0–1 (how pronounced a lean is). */
function lean(value: number): number {
  return Math.min(1, Math.abs(value - 50) / 50);
}

/** Pick a low/mid/high band for a 0–100 value. */
function band(value: number): 'low' | 'mid' | 'high' {
  if (value >= 60) return 'high';
  if (value <= 40) return 'low';
  return 'mid';
}

function scaleVal(map: Record<string, ScaleValue>, id: string): number | null {
  return map[id]?.value ?? null;
}

/* ------------------------------- Jung ------------------------------------- */

const JUNG_AXES = ['energy', 'perception', 'judgment', 'lifestyle'] as const;

function interpretJung(graph: SoulGraph): FacetInterpretation | null {
  const jung = graph.jung;
  if (!jung) return null;

  const insights: Insight[] = [];
  for (const axis of JUNG_AXES) {
    const v = scaleVal(jung.scales, axis);
    if (v === null) continue;
    const b = band(v);
    const strength = lean(v);
    // mid bands get a "balanced" reading; poles get a directional reading.
    const suffix = b === 'mid' ? 'balanced' : b;
    insights.push({
      key: `interpret.jung.${axis}.${suffix}`,
      evidence: 'interpretive',
      strength: b === 'mid' ? 0.2 : strength,
    });
  }

  return {
    facet: 'jung',
    evidence: 'interpretive',
    framework_key: 'interpret.jung.framework',
    standing_key: 'interpret.jung.standing',
    insights,
  };
}

/* ----------------------------- Enneagram ---------------------------------- */

function interpretEnneagram(graph: SoulGraph): FacetInterpretation | null {
  const e = graph.enneagram;
  if (!e) return null;

  // Inconclusive when the engine declined to name a dominant type.
  if (!e.dominant_type) {
    return {
      facet: 'enneagram',
      evidence: 'interpretive',
      framework_key: 'interpret.enneagram.framework',
      standing_key: 'interpret.enneagram.standing',
      inconclusive: true,
      insights: [
        {
          key: 'interpret.enneagram.inconclusive',
          evidence: 'interpretive',
          strength: 0.3,
        },
      ],
    };
  }

  const dom = e.dominant_type;
  const domVal = scaleVal(e.scales, String(dom)) ?? 50;
  const insights: Insight[] = [
    {
      key: `interpret.enneagram.type.${dom}`,
      evidence: 'interpretive',
      strength: lean(domVal),
    },
  ];
  if (e.wing) {
    insights.push({
      key: `interpret.enneagram.wing.${dom}.${e.wing}`,
      evidence: 'interpretive',
      strength: 0.4,
    });
  }

  return {
    facet: 'enneagram',
    evidence: 'interpretive',
    framework_key: 'interpret.enneagram.framework',
    standing_key: 'interpret.enneagram.standing',
    insights,
  };
}

/* ---------------------------- Life Pattern -------------------------------- */

const LIFE_THEMES = [
  'independence',
  'creativity',
  'service',
  'discipline',
  'trust',
  'transformation',
] as const;

function interpretLifePattern(graph: SoulGraph): FacetInterpretation | null {
  const lp = graph.life_pattern;
  if (!lp) return null;

  // Highlight the two strongest themes (experimental — framed as a lens).
  const ranked = LIFE_THEMES.map((theme) => ({ theme, v: scaleVal(lp.scales, theme) }))
    .filter((x): x is { theme: string; v: number } => x.v !== null)
    .sort((a, b) => b.v - a.v);

  const insights: Insight[] = ranked.slice(0, 2).map(({ theme, v }) => ({
    key: `interpret.life.${theme}`,
    evidence: 'experimental',
    strength: lean(v),
  }));

  return {
    facet: 'life_pattern',
    evidence: 'experimental',
    framework_key: 'interpret.life.framework',
    standing_key: 'interpret.life.standing',
    insights,
  };
}

/* ------------------------------- Core ------------------------------------- */

function interpretCore(graph: SoulGraph): FacetInterpretation | null {
  const core = graph.soulgraph_core;
  if (!core) return null;

  const lit = CORE_DIMENSIONS.map((dim) => ({ dim, v: scaleVal(core.scales, dim) }))
    .filter((x): x is { dim: string; v: number } => x.v !== null)
    .sort((a, b) => b.v - a.v);

  const insights: Insight[] = lit.slice(0, 3).map(({ dim, v }) => ({
    key: `interpret.core.${dim}`,
    evidence: 'experimental',
    strength: lean(v),
  }));

  return {
    facet: 'soulgraph_core',
    evidence: 'experimental',
    framework_key: 'interpret.core.framework',
    standing_key: 'interpret.core.standing',
    insights,
  };
}

/* --------------------- Contradictions worth noticing ---------------------- */

/**
 * Cross-framework tensions, framed as questions. Each rule fires only when both
 * sides are pronounced enough to be worth sitting with. Order by strength.
 */
function findTensions(graph: SoulGraph): Tension[] {
  const tensions: Tension[] = [];
  const jung = graph.jung?.scales;
  const lp = graph.life_pattern?.scales;
  const enn = graph.enneagram;
  const core = graph.soulgraph_core?.scales;

  const add = (key: string, facets: string[], strength: number) => {
    if (strength >= 0.25) tensions.push({ key, facets, strength });
  };

  // Introvert energy vs. high service pull.
  if (jung && lp) {
    const energy = scaleVal(jung, 'energy');
    const service = scaleVal(lp, 'service');
    if (energy !== null && service !== null && energy <= 40 && service >= 60) {
      add('interpret.tension.introvert_service', ['jung', 'life_pattern'],
        (lean(energy) + lean(service)) / 2);
    }
  }

  // Thinking judgment vs. Helper/Peacemaker enneagram.
  if (jung && enn?.dominant_type) {
    const judgment = scaleVal(jung, 'judgment'); // high = thinking
    if (judgment !== null && judgment >= 60 && (enn.dominant_type === 2 || enn.dominant_type === 9)) {
      add('interpret.tension.thinking_feeling_type', ['jung', 'enneagram'], lean(judgment));
    }
  }

  // High independence vs. high trust/openness (self-reliant yet open).
  if (lp) {
    const independence = scaleVal(lp, 'independence');
    const trust = scaleVal(lp, 'trust');
    if (independence !== null && trust !== null && independence >= 60 && trust >= 60) {
      add('interpret.tension.independent_trusting', ['life_pattern'],
        (lean(independence) + lean(trust)) / 2);
    }
  }

  // Planned lifestyle vs. high transformation/change pull.
  if (jung && lp) {
    const lifestyle = scaleVal(jung, 'lifestyle'); // high = judging/planned
    const transformation = scaleVal(lp, 'transformation');
    if (lifestyle !== null && transformation !== null && lifestyle >= 60 && transformation >= 60) {
      add('interpret.tension.planned_change', ['jung', 'life_pattern'],
        (lean(lifestyle) + lean(transformation)) / 2);
    }
  }

  // High assertiveness Core vs. high harmony Core.
  if (core) {
    const assertiveness = scaleVal(core, 'assertiveness');
    const harmony = scaleVal(core, 'harmony');
    if (assertiveness !== null && harmony !== null && assertiveness >= 60 && harmony >= 60) {
      add('interpret.tension.assert_harmony', ['soulgraph_core'],
        (lean(assertiveness) + lean(harmony)) / 2);
    }
  }

  return tensions.sort((a, b) => b.strength - a.strength);
}

/* --------------------------------- main ----------------------------------- */

/** Produce the full, deterministic interpretation of a SoulGraph version. */
export function interpretGraph(graph: SoulGraph): GraphInterpretation {
  const facets = [
    interpretJung(graph),
    interpretEnneagram(graph),
    interpretLifePattern(graph),
    interpretCore(graph),
  ].filter((f): f is FacetInterpretation => f !== null);

  const tensions = findTensions(graph);

  // Highlights: the strongest insight from each facet, up to four, strongest first.
  const highlights: Insight[] = facets
    .map((f) => [...f.insights].sort((a, b) => b.strength - a.strength)[0])
    .filter((i): i is Insight => Boolean(i))
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 4);

  return { facets, tensions, highlights };
}
