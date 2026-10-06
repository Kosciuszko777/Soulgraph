/**
 * SoulGraph — entitlement abstraction (Vault/Identity-adjacent).
 *
 * An entitlement is a VERIFIABLE FACT, not a local boolean. In Phase I it is a
 * valid NIP-57 zap receipt from the configured SoulGraph Lightning provider for
 * a zap request signed by the user and tagged with the product id + price
 * version. This interface lets a later issuer service or card provider be added
 * without touching UI code. See docs/ARCHITECTURE.md §10.
 *
 * Pure TypeScript. No React imports.
 */

import type { NostrEvent } from '@nostrify/nostrify';
import { verifyEvent } from 'nostr-tools';
import { PRICE_VERSION } from '@/config/catalog';
import {
  zapRequestProduct,
  zapRequestPriceVersion,
} from '@/core/payment/zapRequest';
import { decodeBolt11 } from '@/lib/bolt11';

export interface Entitlement {
  /** Product id this entitlement grants (see src/config/catalog.ts). */
  product_id: string;
  /** Price version the user paid against. */
  price_version: string;
  /** Pubkey the entitlement belongs to. */
  owner_pubkey: string;
  /** How the entitlement was proven. */
  source: 'zap_receipt' | 'issuer_event' | 'card_provider';
  /** Unix seconds when the entitlement became valid. */
  issued_at: number;
  /** Unix seconds when it expires, if ever (subscriptions). */
  expires_at?: number;
  /** Opaque proof reference (e.g. zap receipt event id). */
  proof_ref: string;
}

/** Query describing the entitlement a caller wants to verify. */
export interface EntitlementQuery {
  owner_pubkey: string;
  product_id: string;
  /** Defaults to the current PRICE_VERSION. */
  price_version?: string;
}

/**
 * Pluggable entitlement backend. Phase I ships a zap-receipt verifier; later a
 * signed-issuer-event verifier or a card-payment verifier can implement the
 * same interface with zero UI changes.
 */
export interface EntitlementProvider {
  /** Human identifier for debugging/telemetry. */
  readonly id: string;
  /** Resolve the current valid entitlement for a query, or null if none. */
  verify(query: EntitlementQuery): Promise<Entitlement | null>;
  /** List all currently-valid entitlements for an owner. */
  list(owner_pubkey: string): Promise<Entitlement[]>;
}

/** Normalize a query, filling the default price version. */
export function normalizeQuery(query: EntitlementQuery): Required<EntitlementQuery> {
  return {
    ...query,
    price_version: query.price_version ?? PRICE_VERSION,
  };
}

/* -------------------------------------------------------------------------- */
/*  ZapReceiptEntitlementProvider                                             */
/* -------------------------------------------------------------------------- */

/** The minimal relay query surface the verifier needs (satisfied by Nostrify). */
export interface RelayQuery {
  query(
    filters: { kinds?: number[]; '#p'?: string[]; limit?: number }[],
    opts?: { signal?: AbortSignal },
  ): Promise<NostrEvent[]>;
}

/** How many sats a product costs right now, for a given price version. */
export type ExpectedSats = (
  productId: string,
  priceVersion: string,
) => Promise<number>;

export interface ZapReceiptProviderConfig {
  /** Relay query surface (the app's Nostr pool). */
  relay: RelayQuery;
  /**
   * The pubkey that signs zap RECEIPTS for the SoulGraph provider (the LNURL
   * service's `nostrPubkey`). A receipt is only trusted when signed by this key.
   */
  receiptSignerPubkey: string;
  /** The SoulGraph recipient pubkey the zap request is addressed to (`p`). */
  recipientPubkey: string;
  /** Resolve the expected sats for a product at a price version. */
  expectedSats: ExpectedSats;
  /** Fractional tolerance on the amount (e.g. 0.15 = ±15%). */
  tolerance: number;
  /** Max receipts to fetch per query. */
  limit?: number;
}

/** A zap receipt's embedded zap request, extracted from the `description` tag. */
function extractZapRequest(receipt: NostrEvent): NostrEvent | null {
  const desc = receipt.tags.find(([n]) => n === 'description')?.[1];
  if (!desc) return null;
  try {
    const parsed = JSON.parse(desc) as NostrEvent;
    if (parsed && typeof parsed === 'object' && parsed.kind === 9734) {
      return parsed;
    }
  } catch {
    // Malformed description — not a usable receipt.
  }
  return null;
}

/** Paid millisatoshis proven by a receipt: the bolt11 amount, then amount tag. */
function receiptPaidMsat(receipt: NostrEvent): number | null {
  const bolt11 = receipt.tags.find(([n]) => n === 'bolt11')?.[1];
  if (bolt11) {
    try {
      const decoded = decodeBolt11(bolt11);
      if (decoded.amountMsat !== null) return decoded.amountMsat;
    } catch {
      // Fall through to the amount tag.
    }
  }
  const amount = receipt.tags.find(([n]) => n === 'amount')?.[1];
  if (amount) {
    const n = Number(amount);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/**
 * Verify a single receipt against a normalized query. Pure and synchronous
 * except for the expected-sats lookup, so it is trivially unit-testable with
 * fixture receipts. Returns an Entitlement or null (with a reason logged).
 *
 * Checks, in order:
 *   1. receipt is kind 9735 and signed by the configured receipt-signer;
 *   2. receipt is addressed to the configured SoulGraph recipient (`p`);
 *   3. it embeds a valid, signed zap request from the OWNER (not a foreigner);
 *   4. the zap request carries the right product (and price version);
 *   5. the paid amount meets the expected price within tolerance.
 */
export async function verifyReceipt(
  receipt: NostrEvent,
  query: Required<EntitlementQuery>,
  config: Omit<ZapReceiptProviderConfig, 'relay' | 'limit'>,
): Promise<Entitlement | null> {
  // 1. Receipt kind + signer.
  if (receipt.kind !== 9735) return null;
  if (receipt.pubkey !== config.receiptSignerPubkey) return null;
  if (!verifyEvent(receipt)) return null;

  // 2. Addressed to the SoulGraph recipient.
  const recipientTag = receipt.tags.find(([n]) => n === 'p')?.[1];
  if (recipientTag !== config.recipientPubkey) return null;

  // 3. Embedded zap request, signed by the OWNER.
  const zapRequest = extractZapRequest(receipt);
  if (!zapRequest) return null;
  if (zapRequest.pubkey !== query.owner_pubkey) return null;
  if (!verifyEvent(zapRequest)) return null;

  // 4. Product + price version stamped by the owner's zap request.
  if (zapRequestProduct(zapRequest.tags) !== query.product_id) return null;
  const pv = zapRequestPriceVersion(zapRequest.tags);
  if (pv !== undefined && pv !== query.price_version) return null;

  // 5. Amount meets the expected price within tolerance.
  const paidMsat = receiptPaidMsat(receipt);
  if (paidMsat === null) return null;
  const expectedSats = await config.expectedSats(
    query.product_id,
    query.price_version,
  );
  const expectedMsat = expectedSats * 1000;
  const minMsat = expectedMsat * (1 - config.tolerance);
  if (paidMsat < minMsat) return null;

  return {
    product_id: query.product_id,
    price_version: query.price_version,
    owner_pubkey: query.owner_pubkey,
    source: 'zap_receipt',
    issued_at: receipt.created_at,
    proof_ref: receipt.id,
  };
}

/**
 * Phase I entitlement provider. Queries relays for zap receipts addressed to
 * the SoulGraph recipient, then verifies each against the product/price/owner.
 */
export class ZapReceiptEntitlementProvider implements EntitlementProvider {
  readonly id = 'zap-receipt';
  private readonly config: ZapReceiptProviderConfig;

  constructor(config: ZapReceiptProviderConfig) {
    this.config = config;
  }

  private async fetchReceipts(signal?: AbortSignal): Promise<NostrEvent[]> {
    return this.config.relay.query(
      [
        {
          kinds: [9735],
          '#p': [this.config.recipientPubkey],
          limit: this.config.limit ?? 200,
        },
      ],
      { signal },
    );
  }

  async verify(query: EntitlementQuery): Promise<Entitlement | null> {
    const normalized = normalizeQuery(query);
    const receipts = await this.fetchReceipts();
    const { relay: _relay, limit: _limit, ...verifyConfig } = this.config;
    void _relay;
    void _limit;
    for (const receipt of receipts) {
      const entitlement = await verifyReceipt(receipt, normalized, verifyConfig);
      if (entitlement) return entitlement;
    }
    return null;
  }

  async list(owner_pubkey: string): Promise<Entitlement[]> {
    const receipts = await this.fetchReceipts();
    const { relay: _relay, limit: _limit, ...verifyConfig } = this.config;
    void _relay;
    void _limit;
    const out: Entitlement[] = [];
    const seen = new Set<string>();
    for (const receipt of receipts) {
      const zapRequest = extractZapRequest(receipt);
      const productId = zapRequest ? zapRequestProduct(zapRequest.tags) : undefined;
      if (!productId || seen.has(productId)) continue;
      const query = normalizeQuery({ owner_pubkey, product_id: productId });
      const entitlement = await verifyReceipt(receipt, query, verifyConfig);
      if (entitlement) {
        out.push(entitlement);
        seen.add(productId);
      }
    }
    return out;
  }
}

/* -------------------------------------------------------------------------- */
/*  Stub providers — interfaces for a later service to plug into.             */
/* -------------------------------------------------------------------------- */

/**
 * STUB. A later SoulGraph issuer service signs entitlement events with an
 * issuer key; this provider would verify those instead of (or alongside) zap
 * receipts — e.g. for card payments reconciled off-Lightning, or for
 * subscriptions with explicit expiry. Not implemented in Phase I; the interface
 * exists so the UI (useEntitlement) never has to change when it ships.
 */
export interface IssuerEntitlementProviderConfig {
  /** Pubkey the issuer signs entitlement events with. */
  issuerPubkey: string;
  /** Relay query surface. */
  relay: RelayQuery;
}

export class IssuerEntitlementProvider implements EntitlementProvider {
  readonly id = 'issuer-event';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(private readonly config: IssuerEntitlementProviderConfig) {}

  async verify(_query: EntitlementQuery): Promise<Entitlement | null> {
    void _query;
    // Phase VII+: query kind-N issuer events signed by `issuerPubkey`, check
    // they name the owner + product + price version, and map to an Entitlement.
    return null;
  }

  async list(_owner_pubkey: string): Promise<Entitlement[]> {
    void _owner_pubkey;
    return [];
  }
}

/**
 * STUB. A card-payment provider: a later hosted service settles a card charge
 * and issues a verifiable receipt (most likely a signed issuer event, verified
 * via IssuerEntitlementProvider). This stub records the seam so a card checkout
 * can be added without touching UI code. Not implemented in Phase I.
 */
export interface CardPaymentProviderConfig {
  /** Base URL of the card settlement service. */
  endpoint: string;
}

export class CardPaymentProvider implements EntitlementProvider {
  readonly id = 'card-provider';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(private readonly config: CardPaymentProviderConfig) {}

  async verify(_query: EntitlementQuery): Promise<Entitlement | null> {
    void _query;
    return null;
  }

  async list(_owner_pubkey: string): Promise<Entitlement[]> {
    void _owner_pubkey;
    return [];
  }
}
