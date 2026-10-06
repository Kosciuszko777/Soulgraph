/**
 * Fetch a NIP-57 zap invoice from an LNURL-pay callback and validate it.
 *
 * The LNURL endpoint is chosen by the payment RECIPIENT, so the invoice it
 * returns is attacker-controlled whenever the recipient is hostile. We re-check
 * the invoice against the exact amount the user approved before any wallet sees
 * it (`assertInvoiceAmount`), and verify it commits only to the zap request /
 * LNURL metadata (`invoiceCommitsTo`). See docs/ARCHITECTURE.md §10.
 */

import type { NostrEvent } from '@nostrify/nostrify';
import type { LnurlPayParams } from '@/lib/lnurlPay';
import { assertInvoiceAmount, invoiceCommitsTo, type DecodedInvoice } from '@/lib/bolt11';

export interface ZapInvoice {
  /** BOLT11 invoice string. */
  invoice: string;
  /** Decoded invoice (amount guaranteed to match the request). */
  decoded: DecodedInvoice & { amountMsat: number };
}

/**
 * Build the callback URL and fetch the invoice for a signed zap request.
 *
 * @param params   the resolved LNURL-pay parameters (callback, bounds, metadata)
 * @param amountMsat the amount the user approved, in millisatoshis
 * @param zapRequest the SIGNED kind-9734 zap request
 * @param lnurl    the bech32 LNURL the zap targets (NIP-57 `lnurl` query param)
 */
export async function fetchZapInvoice(
  params: LnurlPayParams,
  amountMsat: number,
  zapRequest: NostrEvent,
  lnurl: string | undefined,
  signal?: AbortSignal,
): Promise<ZapInvoice> {
  if (amountMsat < params.minSendable || amountMsat > params.maxSendable) {
    throw new Error(
      `Amount ${Math.round(amountMsat / 1000)} sats is outside the provider's accepted range.`,
    );
  }

  const url = new URL(params.callback);
  url.searchParams.set('amount', String(amountMsat));
  url.searchParams.set('nostr', JSON.stringify(zapRequest));
  if (lnurl) url.searchParams.set('lnurl', lnurl);

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) {
    throw new Error(`Lightning service returned HTTP ${res.status}`);
  }
  const body: { pr?: unknown; reason?: unknown; status?: unknown } = await res.json();

  if (typeof body.reason === 'string' && !body.pr) {
    throw new Error(body.reason);
  }
  if (typeof body.pr !== 'string') {
    throw new Error('Lightning service returned no invoice');
  }

  // Authenticate the invoice against the approved amount — never trust the sum
  // chosen by the recipient's endpoint.
  const decoded = assertInvoiceAmount(body.pr, amountMsat);

  // Defence in depth: the invoice's description hash, if present, must commit to
  // the zap request (NIP-57) or the LNURL metadata (LUD-06).
  if (!invoiceCommitsTo(decoded, [JSON.stringify(zapRequest), params.metadata])) {
    throw new Error('Lightning service returned an invoice that does not match the request.');
  }

  return { invoice: body.pr, decoded };
}
