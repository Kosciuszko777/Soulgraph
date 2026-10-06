/**
 * SoulGraph — product catalog & pricing (configuration layer).
 *
 * Prices, currencies and commission rates are DATA, never hard-coded in UI or
 * logic. Changing a price here must be the only change required. See
 * docs/ARCHITECTURE.md §10–§11 and docs/SOULGRAPH.md "The pricing ladder".
 *
 * Nothing in this file imports React. It is plain configuration + types.
 */

export type Currency = "EUR" | "CHF";

export type BillingInterval = "one_time" | "monthly" | "yearly";

export interface Price {
  /** Currency of this price. */
  currency: Currency;
  /** Amount in major units (e.g. 4.99 means 4.99 EUR). */
  amount: number;
  /** Billing interval. */
  interval: BillingInterval;
}

/** Which SoulGraph phase a product belongs to (see docs/SOULGRAPH.md). */
export type Phase = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Product {
  /** Stable product id; stamped into zap requests for entitlement verification. */
  id: string;
  /** Short name for display. */
  name: string;
  /** One-line description. */
  tagline: string;
  /** The progression stage this product serves. */
  stage: "person" | "pair" | "team" | "organization";
  /** The phase that introduces this product. Only Phase I products are purchasable now. */
  phase: Phase;
  /**
   * Whether this product can be bought today. Phase I gates everything beyond
   * the first paid tier until later phases ship their machinery.
   */
  purchasable: boolean;
  /** Available prices (e.g. monthly + yearly). Empty for the free tier. */
  prices: Price[];
  /**
   * Price version for THIS product. Stamped into zap requests so an entitlement
   * is validated against the exact price the user paid. Bump when its price
   * changes. Defaults to the global PRICE_VERSION.
   */
  price_version: string;
  /** Short feature bullets for display on the unlock page. (i18n keys or plain text.) */
  features: string[];
  /**
   * Referral commission rate (0–1) for THIS product. Per-product, not global.
   * Phase I records attribution only; the ledger & payouts arrive in Phase VII.
   */
  referral_commission_rate: number;
}

/**
 * Price version. Stamped into zap requests alongside the product id so that an
 * entitlement can be validated against the exact price the user paid. Bump this
 * whenever any price below changes.
 */
export const PRICE_VERSION = "2026.01" as const;

/** Marketplace commission (configured SEPARATELY from referral commission). */
export const MARKETPLACE_COMMISSION_RATE = 0.2;

/** Default recurring referral commission rate, overridable per product. */
export const DEFAULT_REFERRAL_COMMISSION_RATE = 0.3;

/** Minimum group size for any aggregate (team/org) view. See §9. */
export const MIN_AGGREGATION_GROUP = 5;

/**
 * The SoulGraph payment provider. Payments are NIP-57 zaps TO this identity;
 * entitlements are validated against zap receipts signed by its LNURL provider.
 *
 * `pubkey` is the SoulGraph account the zap is addressed to (the recipient `p`
 * tag). `lud16` is its lightning address, resolved to an LNURL-pay endpoint.
 * The receipt-signing pubkey is read live from that endpoint's `nostrPubkey`
 * (NIP-57 Appendix C), never hard-coded — but may be pinned here as a fallback.
 *
 * Replace these with the real SoulGraph identity before shipping payments.
 */
export interface PaymentProviderConfig {
  /** Recipient Nostr pubkey (hex) the zap request is addressed to. */
  pubkey: string;
  /** Lightning address (lud16) of the SoulGraph provider. */
  lud16: string;
  /**
   * Optional pinned receipt-signing pubkey (hex). When set, a receipt is only
   * trusted if signed by this key AND it matches the endpoint's nostrPubkey.
   * When unset, the endpoint's advertised nostrPubkey is used.
   */
  receipt_signer_pubkey?: string;
}

export const SOULGRAPH_PROVIDER: PaymentProviderConfig = {
  // Placeholder SoulGraph identity — replace with the real account.
  pubkey: "5f9d8c7b6a5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c",
  lud16: "soulgraph@walletofsatoshi.com",
};

/**
 * Amount tolerance for entitlement verification. Fiat↔sats conversion drifts
 * with the exchange rate, so a receipt need only be WITHIN this fraction of the
 * expected sats amount to count. 0.15 = ±15%. Configurable, never hard-coded.
 */
export const ENTITLEMENT_AMOUNT_TOLERANCE = 0.15;

/**
 * The pricing ladder. All amounts/currencies/intervals are editable here.
 */
export const CATALOG: Product[] = [
  {
    id: "demo",
    name: "Free Demo",
    tagline: "A 15-question glimpse of your SoulGraph.",
    stage: "person",
    phase: 1,
    purchasable: false, // free — no checkout
    prices: [],
    price_version: PRICE_VERSION,
    features: ["catalog.feature.demo.items", "catalog.feature.demo.carryover", "catalog.feature.local"],
    referral_commission_rate: 0,
  },
  {
    id: "complete_soulgraph",
    name: "Complete SoulGraph",
    tagline: "The full assessment, scored on your device.",
    stage: "person",
    phase: 1,
    purchasable: true,
    prices: [{ currency: "EUR", amount: 4.99, interval: "one_time" }],
    price_version: PRICE_VERSION,
    features: [
      "catalog.feature.complete.full",
      "catalog.feature.complete.results",
      "catalog.feature.complete.onepager",
      "catalog.feature.complete.share",
      "catalog.feature.local",
    ],
    referral_commission_rate: DEFAULT_REFERRAL_COMMISSION_RATE,
  },
  {
    id: "deep_soulgraph",
    name: "Deep SoulGraph",
    tagline: "Extended depth across every facet.",
    stage: "person",
    phase: 1,
    // The extended item bank ships later; not purchasable yet.
    purchasable: false,
    prices: [{ currency: "EUR", amount: 19, interval: "one_time" }],
    price_version: PRICE_VERSION,
    features: ["catalog.feature.deep.bank", "catalog.feature.deep.depth"],
    referral_commission_rate: DEFAULT_REFERRAL_COMMISSION_RATE,
  },
  {
    id: "personal",
    name: "Personal",
    tagline: "Ongoing personal intelligence.",
    stage: "person",
    phase: 2,
    purchasable: false,
    prices: [
      { currency: "CHF", amount: 9, interval: "monthly" },
      { currency: "CHF", amount: 79, interval: "yearly" },
    ],
    price_version: PRICE_VERSION,
    features: ["catalog.feature.personal.ai", "catalog.feature.personal.longitudinal"],
    referral_commission_rate: DEFAULT_REFERRAL_COMMISSION_RATE,
  },
  {
    id: "business",
    name: "Business",
    tagline: "Pairs, teams and professional comparison.",
    stage: "pair",
    phase: 3,
    purchasable: false,
    prices: [
      { currency: "CHF", amount: 29, interval: "monthly" },
      { currency: "CHF", amount: 199, interval: "yearly" },
    ],
    price_version: PRICE_VERSION,
    features: ["catalog.feature.business.pairs", "catalog.feature.business.teams"],
    referral_commission_rate: DEFAULT_REFERRAL_COMMISSION_RATE,
  },
  {
    id: "professional",
    name: "Professional",
    tagline: "For coaches and practitioners.",
    stage: "team",
    phase: 4,
    purchasable: false,
    prices: [
      { currency: "CHF", amount: 89, interval: "monthly" },
      { currency: "CHF", amount: 799, interval: "yearly" },
    ],
    price_version: PRICE_VERSION,
    features: ["catalog.feature.professional.clients", "catalog.feature.professional.tools"],
    referral_commission_rate: DEFAULT_REFERRAL_COMMISSION_RATE,
  },
  {
    id: "organization",
    name: "Organization",
    tagline: "Aggregate intelligence at organizational scale.",
    stage: "organization",
    phase: 6,
    purchasable: false,
    prices: [{ currency: "CHF", amount: 499, interval: "monthly" }],
    price_version: PRICE_VERSION,
    features: ["catalog.feature.org.aggregate", "catalog.feature.org.privacy"],
    referral_commission_rate: DEFAULT_REFERRAL_COMMISSION_RATE,
  },
];

/** The single currently-purchasable product id (Phase I acquisition product). */
export const COMPLETE_SOULGRAPH_ID = "complete_soulgraph";

/** Products the user can actually buy right now. */
export function purchasableProducts(): Product[] {
  return CATALOG.filter((p) => p.purchasable);
}

/** The primary (first) price of a product, if any. */
export function primaryPrice(product: Product): Price | undefined {
  return product.prices[0];
}

/** Look up a product by id. */
export function getProduct(id: string): Product | undefined {
  return CATALOG.find((p) => p.id === id);
}

/** Format a price for display, e.g. "€4.99" or "CHF 9/mo". */
export function formatPrice(price: Price): string {
  const symbol = price.currency === "EUR" ? "€" : "CHF ";
  const amount =
    price.currency === "EUR" ? price.amount.toFixed(2) : String(price.amount);
  const suffix =
    price.interval === "monthly"
      ? "/mo"
      : price.interval === "yearly"
        ? "/yr"
        : "";
  return `${symbol}${amount}${suffix}`;
}

/**
 * The resolved referral commission rate for a product: its own rate, falling
 * back to the configurable default. Phase I records attribution only; the rate
 * is carried now so the Phase VII ledger can be computed retroactively.
 */
export function referralCommissionRate(product: Product): number {
  const rate = product.referral_commission_rate;
  return Number.isFinite(rate) && rate >= 0 && rate <= 1
    ? rate
    : DEFAULT_REFERRAL_COMMISSION_RATE;
}

/**
 * Validate the whole catalog shape. Returns a list of problems; an empty list
 * means the configuration is internally consistent. Called by a unit test so a
 * bad price edit fails CI rather than shipping.
 */
export function validateCatalog(catalog: Product[] = CATALOG): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const p of catalog) {
    if (!p.id) problems.push("product with empty id");
    if (seen.has(p.id)) problems.push(`duplicate product id: ${p.id}`);
    seen.add(p.id);

    if (!p.name) problems.push(`${p.id}: empty name`);
    if (!p.price_version) problems.push(`${p.id}: empty price_version`);

    if (p.referral_commission_rate < 0 || p.referral_commission_rate > 1) {
      problems.push(`${p.id}: referral_commission_rate out of range [0,1]`);
    }

    // Purchasable products must have at least one priced tier; the free demo
    // is the only product allowed to be both non-free-priced and un-purchasable.
    if (p.purchasable && p.prices.length === 0) {
      problems.push(`${p.id}: purchasable but has no price`);
    }

    // Only Phase I products may be purchasable today.
    if (p.purchasable && p.phase !== 1) {
      problems.push(`${p.id}: purchasable but not Phase I (phase ${p.phase})`);
    }

    for (const price of p.prices) {
      if (!(price.amount > 0)) problems.push(`${p.id}: non-positive price amount`);
      if (price.currency !== "EUR" && price.currency !== "CHF") {
        problems.push(`${p.id}: unknown currency ${price.currency}`);
      }
    }
  }

  // Global invariants.
  if (MARKETPLACE_COMMISSION_RATE < 0 || MARKETPLACE_COMMISSION_RATE > 1) {
    problems.push("MARKETPLACE_COMMISSION_RATE out of range [0,1]");
  }
  if (DEFAULT_REFERRAL_COMMISSION_RATE < 0 || DEFAULT_REFERRAL_COMMISSION_RATE > 1) {
    problems.push("DEFAULT_REFERRAL_COMMISSION_RATE out of range [0,1]");
  }
  if (ENTITLEMENT_AMOUNT_TOLERANCE < 0 || ENTITLEMENT_AMOUNT_TOLERANCE >= 1) {
    problems.push("ENTITLEMENT_AMOUNT_TOLERANCE out of range [0,1)");
  }
  if (!getProduct(COMPLETE_SOULGRAPH_ID)?.purchasable) {
    problems.push(`${COMPLETE_SOULGRAPH_ID} must be purchasable`);
  }

  return problems;
}
