/**
 * Constellation — the SoulGraph as a star chart.
 *
 * A deterministic figure: each lit scale across the filled facets becomes a
 * star, positioned by facet sector, sized by confidence, and brightened by
 * value. Edges trace each facet's internal shape. The same graph always draws
 * the same constellation.
 *
 * Rendered as an SVG so it can be shown in the app, placed on the print
 * one-pager, AND serialized onto a canvas for the share-card PNG export.
 * Colours are passed explicitly (not via CSS variables) so canvas serialization
 * is faithful regardless of theme.
 */

import { useMemo } from 'react';
import type { SoulGraph, ScaleValue } from '@/core/graph/schema';

export interface ConstellationTheme {
  bg: string;
  edge: string;
  star: string;
  starDim: string;
  lit: string;
  grid: string;
}

/** Night-atlas palette, resolved to concrete colours for canvas fidelity. */
export const NIGHT_THEME: ConstellationTheme = {
  bg: '#0a1020',
  edge: 'rgba(180,200,230,0.22)',
  star: 'rgba(222,232,248,0.92)',
  starDim: 'rgba(180,200,230,0.45)',
  lit: '#c69749', // aged gold (brand primary)
  grid: 'rgba(120,140,170,0.14)',
};

interface Star {
  x: number;
  y: number;
  r: number;
  brightness: number;
  facet: string;
}

const SIZE = 400;
const CENTER = SIZE / 2;
const RADIUS = 150;

/** Facets placed around the dial, each in its own sector. */
const FACET_ORDER = ['jung', 'enneagram', 'life_pattern', 'soulgraph_core'] as const;

function facetScales(graph: SoulGraph, facet: string): Record<string, ScaleValue> | null {
  switch (facet) {
    case 'jung':
      return graph.jung?.scales ?? null;
    case 'enneagram':
      return graph.enneagram?.scales ?? null;
    case 'life_pattern':
      return graph.life_pattern?.scales ?? null;
    case 'soulgraph_core':
      return graph.soulgraph_core?.scales ?? null;
    default:
      return null;
  }
}

/** Build the deterministic star layout from a graph. */
export function buildConstellation(graph: SoulGraph): { stars: Star[]; edges: [number, number][] } {
  const stars: Star[] = [];
  const edges: [number, number][] = [];

  const presentFacets = FACET_ORDER.filter((f) => {
    const s = facetScales(graph, f);
    return s && Object.keys(s).length > 0;
  });
  const sectorCount = Math.max(presentFacets.length, 1);

  presentFacets.forEach((facet, fi) => {
    const scales = facetScales(graph, facet)!;
    const entries = Object.entries(scales);
    const sectorStart = (fi / sectorCount) * Math.PI * 2 - Math.PI / 2;
    const sectorSpan = (Math.PI * 2) / sectorCount;

    const firstIndex = stars.length;
    entries.forEach(([, v], i) => {
      // Angle within the sector; radius modulated by value so stronger scales
      // sit further out (toward the rim).
      const frac = entries.length > 1 ? i / (entries.length - 1) : 0.5;
      const angle = sectorStart + sectorSpan * (0.15 + 0.7 * frac);
      const rr = 55 + (v.value / 100) * (RADIUS - 55);
      const x = CENTER + Math.cos(angle) * rr;
      const y = CENTER + Math.sin(angle) * rr;
      stars.push({
        x,
        y,
        r: 2 + v.confidence * 3.5,
        brightness: 0.35 + (v.value / 100) * 0.65,
        facet,
      });
    });

    // Chain the facet's stars into a small constellation.
    for (let i = firstIndex; i < stars.length - 1; i++) {
      edges.push([i, i + 1]);
    }
    // Close back to the first star of the facet if it has ≥ 3 stars.
    if (stars.length - firstIndex >= 3) edges.push([stars.length - 1, firstIndex]);
  });

  return { stars, edges };
}

/**
 * Render the constellation as SVG elements (no outer <svg>), so callers can
 * embed it in a sized <svg> of their choice. `litFacet` highlights one facet's
 * stars in gold (used for "newly lit" emphasis).
 */
export function ConstellationFigure({
  graph,
  theme = NIGHT_THEME,
  showGrid = true,
}: {
  graph: SoulGraph;
  theme?: ConstellationTheme;
  showGrid?: boolean;
}) {
  const { stars, edges } = useMemo(() => buildConstellation(graph), [graph]);

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" role="img" aria-label="SoulGraph constellation">
      <rect x={0} y={0} width={SIZE} height={SIZE} fill={theme.bg} />

      {showGrid && (
        <g stroke={theme.grid} strokeWidth={1} fill="none">
          <circle cx={CENTER} cy={CENTER} r={RADIUS} />
          <circle cx={CENTER} cy={CENTER} r={RADIUS * 0.66} />
          <circle cx={CENTER} cy={CENTER} r={RADIUS * 0.33} />
          <line x1={CENTER} y1={CENTER - RADIUS} x2={CENTER} y2={CENTER + RADIUS} />
          <line x1={CENTER - RADIUS} y1={CENTER} x2={CENTER + RADIUS} y2={CENTER} />
        </g>
      )}

      <g stroke={theme.edge} strokeWidth={1} strokeLinecap="round">
        {edges.map(([a, b], i) => (
          <line key={i} x1={stars[a].x} y1={stars[a].y} x2={stars[b].x} y2={stars[b].y} />
        ))}
      </g>

      <g>
        {stars.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={s.brightness > 0.75 ? theme.lit : theme.star}
            opacity={s.brightness}
          />
        ))}
      </g>
    </svg>
  );
}
