/**
 * SoulGraph — referral attribution (first-touch).
 *
 * Captures `?ref=<npub or code>` plus UTM params at first touch, stores them
 * locally, binds them to the user's pubkey when identity is created, and is
 * carried as a tag in every zap request. Phase I RECORDS attribution only; the
 * commission ledger and payouts arrive in Phase VII. See docs/ARCHITECTURE.md §11.
 *
 * Pure TypeScript. No React imports (a thin hook wraps this for the UI).
 */

export interface Attribution {
  /** Raw referral code or npub from ?ref=. */
  ref?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  /** Unix seconds of first touch. */
  captured_at: number;
  /** Bound owner pubkey once identity exists. */
  owner_pubkey?: string;
}

export const ATTRIBUTION_STORAGE_KEY = 'soulgraph:attribution';

/** Parse attribution params from a URL search string (first-touch only). */
export function parseAttribution(search: string, now: number): Attribution | null {
  const params = new URLSearchParams(search);
  const ref = params.get('ref') ?? undefined;
  const utm_source = params.get('utm_source') ?? undefined;
  const utm_medium = params.get('utm_medium') ?? undefined;
  const utm_campaign = params.get('utm_campaign') ?? undefined;
  const utm_content = params.get('utm_content') ?? undefined;
  const utm_term = params.get('utm_term') ?? undefined;

  if (!ref && !utm_source && !utm_medium && !utm_campaign && !utm_content && !utm_term) {
    return null;
  }

  return {
    ref,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    captured_at: now,
  };
}

/**
 * Convert an attribution record into zap-request tags so that attribution is
 * recorded at payment time. Only non-empty fields are emitted.
 */
export function attributionTags(attr: Attribution | null): string[][] {
  if (!attr) return [];
  const tags: string[][] = [];
  if (attr.ref) tags.push(['soulgraph_ref', attr.ref]);
  if (attr.utm_source) tags.push(['soulgraph_utm_source', attr.utm_source]);
  if (attr.utm_medium) tags.push(['soulgraph_utm_medium', attr.utm_medium]);
  if (attr.utm_campaign) tags.push(['soulgraph_utm_campaign', attr.utm_campaign]);
  return tags;
}
