/**
 * useEntitlement — the single place the UI asks "may this user access X?".
 *
 * An entitlement is a verifiable FACT, not a local boolean (docs/ARCHITECTURE.md
 * §10). In Phase I / Prompt 4 the Complete SoulGraph is ungated behind a
 * development flag, so this hook simply reports "entitled" while
 * COMPLETE_SOULGRAPH_GATED is false. Prompt 5 replaces the body with real
 * verification (a NIP-57 zap receipt from the configured provider) WITHOUT
 * touching any calling component — that is the whole point of this seam.
 */

import { COMPLETE_SOULGRAPH_GATED } from '@/config/flags';

export interface Entitlement {
  /** Whether the user may take the full assessment & see complete results. */
  complete: boolean;
  /** Whether gating is active at all (false during development). */
  gated: boolean;
  /** True while an async entitlement check is in flight (always false for now). */
  loading: boolean;
}

export function useEntitlement(): Entitlement {
  // Prompt 5: resolve a real entitlement here (zap receipt verification).
  const complete = !COMPLETE_SOULGRAPH_GATED;
  return { complete, gated: COMPLETE_SOULGRAPH_GATED, loading: false };
}
