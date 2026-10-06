/**
 * graphSummary — compact, display-ready extracts of a SoulGraph.
 *
 * Shared by the on-screen graph, the one-pager plate, and the share card so the
 * same numbers render identically everywhere. Pure data extraction — no React.
 */

import type { SoulGraph } from '@/core/graph/schema';
import { CORE_DIMENSIONS } from '@/core/engine/core-mapping';

export interface AxisSummary {
  id: string;
  value: number;
  confidence: number;
}

export interface ThemeSummary {
  id: string;
  value: number;
}

export interface GraphSummary {
  jungCode?: string;
  jungAxes: AxisSummary[];
  enneagramDominant?: number;
  enneagramWing?: number;
  enneagramInconclusive: boolean;
  lifeTop: ThemeSummary[];
  lifeCode?: string;
  coreTop: ThemeSummary[];
}

const JUNG_AXES = ['energy', 'perception', 'judgment', 'lifestyle'] as const;
const LIFE_THEMES = [
  'independence',
  'creativity',
  'service',
  'discipline',
  'trust',
  'transformation',
] as const;

export function summarizeGraph(graph: SoulGraph): GraphSummary {
  const jungAxes: AxisSummary[] = [];
  if (graph.jung) {
    for (const axis of JUNG_AXES) {
      const v = graph.jung.scales[axis];
      if (v) jungAxes.push({ id: axis, value: v.value, confidence: v.confidence });
    }
  }

  const lifeTop: ThemeSummary[] = graph.life_pattern
    ? LIFE_THEMES.map((id) => ({ id, value: graph.life_pattern!.scales[id]?.value ?? -1 }))
        .filter((x) => x.value >= 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
    : [];

  const coreTop: ThemeSummary[] = graph.soulgraph_core
    ? CORE_DIMENSIONS.map((id) => ({ id, value: graph.soulgraph_core!.scales[id]?.value ?? -1 }))
        .filter((x) => x.value >= 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 4)
    : [];

  return {
    jungCode: graph.jung?.type_code,
    jungAxes,
    enneagramDominant: graph.enneagram?.dominant_type,
    enneagramWing: graph.enneagram?.wing,
    enneagramInconclusive: Boolean(graph.enneagram && !graph.enneagram.dominant_type),
    lifeTop,
    lifeCode: graph.life_pattern?.pattern_code,
    coreTop,
  };
}
