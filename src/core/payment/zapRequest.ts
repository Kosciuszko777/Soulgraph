/**
 * NIP-57 zap request construction for SoulGraph entitlement payments.
 *
 * A SoulGraph purchase is a NIP-57 zap FROM the buyer TO the configured
 * SoulGraph provider pubkey, stamped with:
 *   - which product was bought (`soulgraph_product`),
 *   - the price version it was bought at (`soulgraph_price_version`), and
 *   - (if present) first-touch referral attribution (`soulgraph_ref` + UTM).
 *
 * The resulting zap receipt (kind 9735) is a verifiable fact that the user
 * paid, which is exactly what `ZapReceiptEntitlementProvider` checks later. The
 * zap request is SIGNED (by the buyer) but NOT published to relays — it is sent
 * in the LNURL callback query string, and the provider's LNURL service embeds
 * it in the receipt it publishes. See docs/ARCHITECTURE.md §10–§11,
 * docs/NIP-SOULGRAPH.md.
 *
 * Pure TypeScript. No React imports. The actual signing is delegated to a
 * caller-supplied function so this module stays signer-agnostic.
 */

import type { Attribution } from '@/core/referral/attribution';
import { attributionTags } from '@/core/referral/attribution';

/** Tag names SoulGraph stamps into zap requests (documented in NIP-SOULGRAPH.md). */
export const ZAP_TAG_PRODUCT = 'soulgraph_product';
export const ZAP_TAG_PRICE_VERSION = 'soulgraph_price_version';

/** An unsigned NIP-57 zap request template (kind 9734). */
export interface ZapRequestTemplate {
  kind: 9734;
  content: string;
  created_at: number;
  tags: string[][];
}

export interface BuildZapRequestInput {
  /** Recipient (SoulGraph provider) pubkey, hex. */
  recipientPubkey: string;
  /** Amount in millisatoshis the invoice will be for. */
  amountMsat: number;
  /** Relays the receipt should be published to (NIP-57 `relays` tag). */
  relays: string[];
  /** Product id being purchased. */
  productId: string;
  /** Price version the product is priced at. */
  priceVersion: string;
  /** LNURL (bech32 or the resolved metadata id) the zap targets, optional. */
  lnurl?: string;
  /** First-touch attribution, if any. Self-referrals are dropped by caller. */
  attribution?: Attribution | null;
  /** Buyer pubkey — used to drop self-referral `ref` tags. */
  buyerPubkey?: string;
  /** Optional human comment carried as the zap request content. */
  comment?: string;
  /** Override creation time (defaults to now). */
  createdAt?: number;
}

/**
 * Build the unsigned NIP-57 zap request template with SoulGraph's product /
 * price-version / referral tags. The caller signs it with the buyer's signer.
 */
export function buildZapRequest(input: BuildZapRequestInput): ZapRequestTemplate {
  const {
    recipientPubkey,
    amountMsat,
    relays,
    productId,
    priceVersion,
    lnurl,
    attribution,
    buyerPubkey,
    comment,
    createdAt,
  } = input;

  const tags: string[][] = [
    ['p', recipientPubkey],
    ['amount', String(amountMsat)],
    ['relays', ...relays],
    [ZAP_TAG_PRODUCT, productId],
    [ZAP_TAG_PRICE_VERSION, priceVersion],
  ];

  if (lnurl) tags.push(['lnurl', lnurl]);

  // Referral + UTM attribution (self-referral `ref` suppressed by this call).
  tags.push(...attributionTags(attribution ?? null, buyerPubkey));

  return {
    kind: 9734,
    content: comment ?? '',
    created_at: createdAt ?? Math.floor(Date.now() / 1000),
    tags,
  };
}

/** Read the product id a zap request (signed or unsigned) was stamped with. */
export function zapRequestProduct(tags: string[][]): string | undefined {
  return tags.find(([n]) => n === ZAP_TAG_PRODUCT)?.[1];
}

/** Read the price version a zap request was stamped with. */
export function zapRequestPriceVersion(tags: string[][]): string | undefined {
  return tags.find(([n]) => n === ZAP_TAG_PRICE_VERSION)?.[1];
}

/** Read the referral code (if any) a zap request was stamped with. */
export function zapRequestRef(tags: string[][]): string | undefined {
  return tags.find(([n]) => n === 'soulgraph_ref')?.[1];
}

/** Read the `amount` (millisatoshis) tag from a zap request. */
export function zapRequestAmountMsat(tags: string[][]): number | undefined {
  const raw = tags.find(([n]) => n === 'amount')?.[1];
  if (raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}
