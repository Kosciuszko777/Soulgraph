import { useCallback, useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useSoulGraphProvider } from '@/hooks/useSoulGraphProvider';
import { useAttribution } from '@/hooks/useAttribution';
import { SOULGRAPH_PROVIDER, type Product } from '@/config/catalog';
import { APP_RELAYS } from '@/lib/appRelays';
import { buildZapRequest } from '@/core/payment/zapRequest';
import { fetchZapInvoice } from '@/lib/fetchZapInvoice';
import {
  getNwcConnectionString,
  hasWebLN,
  payWithNwc,
  payWithWebLN,
} from '@/lib/wallet';
import type { NostrEvent } from '@nostrify/nostrify';

/** Which rail a payment used / will use. */
export type PaymentRail = 'nwc' | 'webln' | 'manual';

export type CheckoutPhase =
  | 'idle'
  | 'preparing' // building + signing the zap request, fetching the invoice
  | 'paying' // sending the payment over NWC/WebLN
  | 'invoice' // showing a BOLT11 invoice for manual (QR) payment
  | 'paid' // payment succeeded on this rail (receipt still verified separately)
  | 'error';

export interface CheckoutState {
  phase: CheckoutPhase;
  /** The BOLT11 invoice, once fetched (always set while phase === 'invoice'). */
  invoice: string | null;
  /** The amount being charged, in millisatoshis. */
  amountMsat: number | null;
  /** Which rail is preferred / was used. */
  rail: PaymentRail | null;
  /** Any error message to show. */
  error: string | null;
}

const INITIAL: CheckoutState = {
  phase: 'idle',
  invoice: null,
  amountMsat: null,
  rail: null,
  error: null,
};

/**
 * Drive a Lightning checkout for a SoulGraph product.
 *
 * The flow:
 *   1. Build a NIP-57 zap request stamped with product + price version + ref.
 *   2. Sign it with the buyer's signer.
 *   3. Resolve the provider's LNURL callback and fetch a validated invoice.
 *   4. Pay via NWC (if connected), else WebLN (if available), else expose the
 *      BOLT11 for QR/manual payment.
 *
 * The entitlement is NOT granted here — paying only produces a receipt. The
 * receipt is verified independently by `useEntitlement`, which is the single
 * source of truth. This hook's `paid` phase is just UI feedback.
 */
export function useCheckout(product: Product, amountMsat: number | null) {
  const { user } = useCurrentUser();
  const provider = useSoulGraphProvider();
  const attribution = useAttribution();
  const [state, setState] = useState<CheckoutState>(INITIAL);

  const reset = useCallback(() => setState(INITIAL), []);

  const start = useCallback(async () => {
    if (!user?.signer) {
      setState({ ...INITIAL, phase: 'error', error: 'You must be signed in to pay.' });
      return;
    }
    if (!amountMsat || amountMsat <= 0) {
      setState({ ...INITIAL, phase: 'error', error: 'Could not determine the price in sats. Try again.' });
      return;
    }
    if (!provider.data) {
      setState({ ...INITIAL, phase: 'error', error: 'The payment provider is unavailable right now. Try again shortly.' });
      return;
    }

    setState({ ...INITIAL, phase: 'preparing', amountMsat });

    try {
      const relays = APP_RELAYS.relays.filter((r) => r.write).map((r) => r.url);

      // 1 + 2: build + sign the zap request stamped with product/price/ref.
      const template = buildZapRequest({
        recipientPubkey: SOULGRAPH_PROVIDER.pubkey,
        amountMsat,
        relays,
        productId: product.id,
        priceVersion: product.price_version,
        attribution,
        buyerPubkey: user.pubkey,
      });
      const signed = (await user.signer.signEvent(template)) as NostrEvent;

      // 3: fetch a validated invoice from the provider's LNURL callback.
      const { invoice } = await fetchZapInvoice(
        provider.data.params,
        amountMsat,
        signed,
        undefined,
      );

      // 4: choose a payment rail.
      const nwcConnection = getNwcConnectionString();
      if (nwcConnection) {
        setState({ phase: 'paying', invoice, amountMsat, rail: 'nwc', error: null });
        try {
          await payWithNwc(nwcConnection, invoice, amountMsat);
          setState({ phase: 'paid', invoice, amountMsat, rail: 'nwc', error: null });
          return;
        } catch (err) {
          // Fall through to WebLN / manual with the same invoice.
          console.warn('NWC payment failed, falling back:', err);
        }
      }

      if (hasWebLN()) {
        setState({ phase: 'paying', invoice, amountMsat, rail: 'webln', error: null });
        try {
          await payWithWebLN(invoice, amountMsat);
          setState({ phase: 'paid', invoice, amountMsat, rail: 'webln', error: null });
          return;
        } catch (err) {
          console.warn('WebLN payment failed, falling back to manual:', err);
        }
      }

      // Manual: expose the invoice for QR / copy.
      setState({ phase: 'invoice', invoice, amountMsat, rail: 'manual', error: null });
    } catch (err) {
      setState({
        ...INITIAL,
        phase: 'error',
        amountMsat,
        error: err instanceof Error ? err.message : 'Checkout failed. Please try again.',
      });
    }
  }, [user, amountMsat, provider.data, product.id, product.price_version, attribution]);

  /** Mark the manual invoice as paid (user confirms they paid from their wallet). */
  const markPaid = useCallback(() => {
    setState((s) => ({ ...s, phase: 'paid' }));
  }, []);

  return { state, start, reset, markPaid, providerLoading: provider.isLoading };
}
