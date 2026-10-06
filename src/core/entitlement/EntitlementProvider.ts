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

import { PRICE_VERSION } from "@/config/catalog";

export interface Entitlement {
  /** Product id this entitlement grants (see src/config/catalog.ts). */
  product_id: string;
  /** Price version the user paid against. */
  price_version: string;
  /** Pubkey the entitlement belongs to. */
  owner_pubkey: string;
  /** How the entitlement was proven. */
  source: "zap_receipt" | "issuer_event" | "card_provider";
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
