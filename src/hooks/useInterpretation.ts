import { useMemo } from 'react';
import type { SoulGraph } from '@/core/graph/schema';
import { interpretGraph, type GraphInterpretation } from '@/core/interpret';

/** Memoized, deterministic interpretation of a SoulGraph version. */
export function useInterpretation(graph: SoulGraph | null): GraphInterpretation | null {
  return useMemo(() => (graph ? interpretGraph(graph) : null), [graph]);
}
