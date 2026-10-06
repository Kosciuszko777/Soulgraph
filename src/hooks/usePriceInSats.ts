import { useQuery } from '@tanstack/react-query';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { Currency } from '@/config/catalog';
import {
  fetchRate,
  fiatToSats,
  fiatToMsat,
  type RateSnapshot,
} from '@/core/payment/rate';

/**
 * usePriceInSats — convert a configured fiat price into a live sats amount.
 *
 * Prices are configured in fiat (docs/ARCHITECTURE.md §10). The sats a user
 * actually pays is derived live from a configurable rate source, with:
 *   - a CACHED fallback (persisted per currency to localStorage), so a brief
 *     network failure still shows a sensible sats figure, and
 *   - a visible "rate as of" timestamp so the user knows how fresh it is.
 *
 * The amount is advisory: entitlement verification applies a tolerance
 * (ENTITLEMENT_AMOUNT_TOLERANCE) precisely because this number drifts.
 */

export interface SatsPrice {
  /** Satoshis for `amount` at the current/cached rate, or null if unknown. */
  sats: number | null;
  /** Millisatoshis (what LNURL / zap amounts use), or null if unknown. */
  msat: number | null;
  /** The rate snapshot used (live or cached). */
  rate: RateSnapshot | null;
  /** True while the first live fetch is in flight with no cache to fall back on. */
  loading: boolean;
  /** True when `rate` came from the local cache rather than a live fetch. */
  stale: boolean;
  /** Any error from the live fetch (cache may still be serving). */
  error: Error | null;
  /** Re-fetch the live rate. */
  refresh: () => void;
}

/** How long a cached rate is considered fresh (10 minutes). */
const RATE_FRESH_SECONDS = 10 * 60;

function cacheKey(currency: Currency): string {
  return `soulgraph:rate:${currency}`;
}

export function usePriceInSats(amount: number, currency: Currency): SatsPrice {
  // Persist the last good rate per currency so we always have a fallback.
  const [cached, setCached] = useLocalStorage<RateSnapshot | null>(
    cacheKey(currency),
    null,
  );

  const query = useQuery<RateSnapshot>({
    queryKey: ['btc-rate', currency],
    queryFn: async ({ signal }) => {
      const snapshot = await fetchRate(currency, signal);
      setCached(snapshot);
      return snapshot;
    },
    // Refresh in the background; the cache keeps the UI populated.
    staleTime: RATE_FRESH_SECONDS * 1000,
    refetchInterval: RATE_FRESH_SECONDS * 1000,
    retry: 1,
  });

  const live = query.data ?? null;
  const rate = live ?? cached;
  const stale = !live && Boolean(cached);

  const sats = rate ? fiatToSats(amount, rate) : null;
  const msat = rate ? fiatToMsat(amount, rate) : null;

  return {
    sats,
    msat,
    rate,
    loading: query.isLoading && !cached,
    stale,
    error: query.error instanceof Error ? query.error : null,
    refresh: () => void query.refetch(),
  };
}
