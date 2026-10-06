import { useQuery } from '@tanstack/react-query';
import { SOULGRAPH_PROVIDER } from '@/config/catalog';
import { resolveLnurlPay, type LnurlPayParams } from '@/lib/lnurlPay';

/**
 * Resolve the SoulGraph payment provider's LNURL-pay parameters, including the
 * `nostrPubkey` the endpoint signs zap receipts with (NIP-57 Appendix C).
 *
 * The receipt-signer pubkey is read LIVE from the endpoint and never hard-coded
 * — but a pinned fallback (`receipt_signer_pubkey`) may be configured, in which
 * case the endpoint's advertised key must match it or the resolution is
 * rejected (an endpoint that changed its signing key is not trusted silently).
 */
export interface SoulGraphProviderResolution {
  params: LnurlPayParams;
  /** The pubkey to trust zap receipts from. */
  receiptSignerPubkey: string;
}

async function resolveProvider(
  signal?: AbortSignal,
): Promise<SoulGraphProviderResolution> {
  const params = await resolveLnurlPay({ lud16: SOULGRAPH_PROVIDER.lud16 }, signal);

  if (!params.allowsNostr || !params.nostrPubkey) {
    throw new Error('SoulGraph payment provider does not support Nostr zaps');
  }

  const pinned = SOULGRAPH_PROVIDER.receipt_signer_pubkey;
  if (pinned && pinned !== params.nostrPubkey) {
    throw new Error('SoulGraph provider receipt-signing key does not match the pinned key');
  }

  return { params, receiptSignerPubkey: params.nostrPubkey };
}

export function useSoulGraphProvider() {
  return useQuery<SoulGraphProviderResolution>({
    queryKey: ['soulgraph-provider', SOULGRAPH_PROVIDER.lud16],
    queryFn: ({ signal }) => resolveProvider(signal),
    staleTime: 60 * 60 * 1000, // an hour; the endpoint rarely changes
    retry: 1,
  });
}
