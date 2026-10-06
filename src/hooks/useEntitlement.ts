/**
 * useEntitlement — the single place the UI asks "may this user access X?".
 *
 * An entitlement is a verifiable FACT, not a local boolean (docs/ARCHITECTURE.md
 * §10). In Phase I it is a valid NIP-57 zap receipt from the configured provider
 * for a zap request the user signed, tagged with the product id + price version,
 * whose amount meets the product price within a configurable tolerance.
 *
 * Resolution order:
 *   1. Dev flag off → ungated (everyone entitled). For local work without a wallet.
 *   2. Vault cache → instant, offline answer after one successful verification.
 *   3. Relay verification → the source of truth; re-confirms on every device.
 *
 * The gating flag is the ONLY place gating is decided; every caller uses this
 * hook, so flipping it or swapping the entitlement provider touches no UI.
 */

import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useSoulGraphProvider } from '@/hooks/useSoulGraphProvider';
import { COMPLETE_SOULGRAPH_GATED } from '@/config/flags';
import {
  SOULGRAPH_PROVIDER,
  ENTITLEMENT_AMOUNT_TOLERANCE,
  getProduct,
  primaryPrice,
} from '@/config/catalog';
import { fetchRate, fiatToSats } from '@/core/payment/rate';
import {
  ZapReceiptEntitlementProvider,
  type RelayQuery,
  type Entitlement as EntitlementFact,
} from '@/core/entitlement/EntitlementProvider';
import {
  cacheEntitlement,
  clearCachedEntitlement,
  getCachedEntitlement,
} from '@/core/vault/vault';

/** Where a checkout stands, for clear UI feedback. */
export type PaymentState =
  | 'idle' // not applicable (ungated, or not logged in)
  | 'awaiting' // no receipt yet; waiting for payment
  | 'detected' // a receipt exists in cache, confirming against relays
  | 'verified' // a valid entitlement is confirmed
  | 'failed'; // verification could not complete (e.g. provider unreachable)

export interface EntitlementResult {
  /** Whether the user may access the gated product. */
  entitled: boolean;
  /** Whether gating is active at all (false during development). */
  gated: boolean;
  /** True while an async entitlement check is in flight. */
  loading: boolean;
  /** Clear, user-facing payment state. */
  status: PaymentState;
  /** Any error from the relay verification. */
  error: Error | null;
  /** Re-run verification against relays now (the "check again" action). */
  recheck: () => void;
}

/** Expected sats for a product at a price version, via the live rate. */
async function expectedSatsForProduct(
  productId: string,
  _priceVersion: string,
): Promise<number> {
  void _priceVersion;
  const product = getProduct(productId);
  const price = product ? primaryPrice(product) : undefined;
  if (!price) throw new Error(`No price for product ${productId}`);
  const rate = await fetchRate(price.currency);
  return fiatToSats(price.amount, rate);
}

export function useEntitlement(productId: string): EntitlementResult {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const provider = useSoulGraphProvider();

  const [cached, setCached] = useState<EntitlementFact | null>(null);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  const gated = COMPLETE_SOULGRAPH_GATED;
  const pubkey = user?.pubkey;

  // Load the cached entitlement first for an instant answer.
  useEffect(() => {
    let active = true;
    if (!gated || !pubkey) {
      setCached(null);
      setCacheLoaded(true);
      return;
    }
    setCacheLoaded(false);
    void getCachedEntitlement(pubkey, productId).then((record) => {
      if (!active) return;
      setCached(
        record
          ? {
              product_id: record.product_id,
              price_version: record.price_version,
              owner_pubkey: record.owner_pubkey,
              source: record.source,
              issued_at: record.issued_at,
              expires_at: record.expires_at,
              proof_ref: record.proof_ref,
            }
          : null,
      );
      setCacheLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [gated, pubkey, productId]);

  // Verify against relays (the source of truth). Runs once the provider's
  // receipt-signer is known. Caches on success; clears cache on confirmed miss.
  const verification = useQuery<EntitlementFact | null>({
    queryKey: ['entitlement', pubkey, productId, provider.data?.receiptSignerPubkey],
    enabled: gated && Boolean(pubkey) && Boolean(provider.data),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!pubkey || !provider.data) return null;
      const zapProvider = new ZapReceiptEntitlementProvider({
        relay: nostr as unknown as RelayQuery,
        receiptSignerPubkey: provider.data.receiptSignerPubkey,
        recipientPubkey: SOULGRAPH_PROVIDER.pubkey,
        expectedSats: expectedSatsForProduct,
        tolerance: ENTITLEMENT_AMOUNT_TOLERANCE,
      });
      const fact = await zapProvider.verify({ owner_pubkey: pubkey, product_id: productId });
      if (fact) {
        await cacheEntitlement(fact);
      } else {
        // A confirmed miss invalidates any stale cache entry.
        await clearCachedEntitlement(pubkey, productId);
      }
      return fact;
    },
  });

  // `refetch` is referentially stable across renders in TanStack Query.
  const refetch = verification.refetch;
  const recheck = useCallback(() => {
    void refetch();
  }, [refetch]);

  // --- Resolve the result ---

  if (!gated) {
    return { entitled: true, gated: false, loading: false, status: 'idle', error: null, recheck };
  }

  if (!pubkey) {
    return { entitled: false, gated: true, loading: false, status: 'idle', error: null, recheck };
  }

  const verified = verification.data ?? null;
  const entitled = Boolean(verified ?? cached);

  const providerError = provider.error instanceof Error ? provider.error : null;
  const verifyError = verification.error instanceof Error ? verification.error : null;
  const error = verifyError ?? providerError;

  const loading =
    !cacheLoaded || provider.isLoading || (verification.isFetching && !verified);

  let status: PaymentState;
  if (verified) {
    status = 'verified';
  } else if (error && !cached) {
    status = 'failed';
  } else if (cached) {
    // We have a cached fact; relays are still confirming it.
    status = verification.isFetching ? 'detected' : 'verified';
  } else {
    status = 'awaiting';
  }

  return { entitled, gated: true, loading, status, error, recheck };
}
