/**
 * Lightning wallet detection + payment helpers for SoulGraph checkout.
 *
 * Two payment rails beyond manual QR:
 *   - NWC (NIP-47): a `nostr+walletconnect://` connection the user has saved,
 *     paid via `@getalby/sdk`'s NWC client.
 *   - WebLN: a browser extension wallet (`window.webln`).
 *
 * Every payment re-checks the invoice amount via `assertInvoiceAmount` BEFORE
 * paying — the invoice is only as trustworthy as the endpoint that issued it.
 */

import type { WebLNProvider } from '@webbtc/webln-types';
import { assertInvoiceAmount } from '@/lib/bolt11';

/** localStorage key for a saved NWC connection string (shared with the NWC skill). */
export const NWC_CONNECTION_KEY = 'nwc-active-connection';

/** Read the saved NWC connection string, if any. */
export function getNwcConnectionString(): string | null {
  try {
    const raw = localStorage.getItem(NWC_CONNECTION_KEY);
    if (!raw) return null;
    // The NWC skill stores a bare string; tolerate a JSON-wrapped one too.
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'string' ? parsed : raw;
    } catch {
      return raw;
    }
  } catch {
    return null;
  }
}

/** Whether a WebLN provider is present in this browser. */
export function hasWebLN(): boolean {
  return typeof window !== 'undefined' && Boolean((window as unknown as { webln?: WebLNProvider }).webln);
}

/** Pay an invoice over NWC. Re-checks the amount before paying. */
export async function payWithNwc(
  connectionString: string,
  invoice: string,
  expectedMsat: number,
): Promise<{ preimage: string }> {
  assertInvoiceAmount(invoice, expectedMsat);
  // Imported lazily so the Alby SDK never enters the critical entry bundle.
  const { nwc } = await import('@getalby/sdk');
  const client = new nwc.NWCClient({ nostrWalletConnectUrl: connectionString });
  try {
    const result = await client.payInvoice({ invoice });
    return { preimage: result.preimage };
  } finally {
    client.close?.();
  }
}

/** Pay an invoice over WebLN. Re-checks the amount before paying. */
export async function payWithWebLN(
  invoice: string,
  expectedMsat: number,
): Promise<{ preimage: string }> {
  assertInvoiceAmount(invoice, expectedMsat);
  const webln = (window as unknown as { webln?: WebLNProvider }).webln;
  if (!webln) throw new Error('No WebLN wallet available');
  await webln.enable();
  const result = await webln.sendPayment(invoice);
  return { preimage: result.preimage };
}
