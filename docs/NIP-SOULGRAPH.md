# NIP-SoulGraph — Custom event kinds

SoulGraph reuses existing NIPs wherever possible and defines a small number of custom
kinds only where no existing NIP covers the use case. All kind numbers below were
checked against the public kind registry and chosen from an **unclaimed range**. Every
custom event MUST carry a **NIP-31 `alt`** tag.

> **Privacy invariant:** nothing psychological is ever published unencrypted, and
> nothing is published to public relays by default. All `d` tags on stored envelopes are
> **opaque random identifiers**, never descriptive strings.

---

## Reused NIPs

| Concern | NIP / kind | Notes |
| --- | --- | --- |
| Identity | NIP-07, NIP-46, NIP-49 | Extension, remote signer, encrypted key backup. |
| Encrypted envelope storage (sync) | **NIP-78, kind 30078** | Addressable app-data; opaque `d` tag; content is a facet envelope. |
| Key wrapping | **NIP-44 v2** | Content keys wrapped to owner / grantee pubkeys. |
| Grant delivery | **NIP-59** gift wrap | Wrapped content keys delivered privately to grantees. |
| Deletion / revocation | **NIP-09** | Deletion requests for superseded grants/envelopes. |
| Entitlements | **NIP-57** zap receipts | Verifiable proof of payment. |
| Relay list (sync) | **NIP-65**-style, separate from general app relays | Private/paid relay recommended. |

---

## Custom kinds

### Kind `30078` — Facet envelope (via NIP-78)

Not a new kind; reused from NIP-78. One event per **facet per version**.

- `d`: opaque random identifier (e.g. 32 random bytes hex). Never `"jung"` etc.
- `content`: JSON `{ alg: "AES-256-GCM", iv, ciphertext, wrapped_key }` where
  `wrapped_key` is the NIP-44-wrapped content key to the **owner**.
- Tags: `["alt", "SoulGraph encrypted facet envelope"]`.
- No facet name, version number, or any psychological metadata appears in cleartext tags.

### Kind `33719` — Relationship edge (addressable)

Represents an edge from the owner to another pubkey. Addressable so the latest state of
an edge replaces the previous.

- `d`: opaque random identifier for the edge.
- `content`: NIP-44-encrypted-to-self JSON describing the edge (`type`, counterparty
  pubkey, notes). Encrypted because the mere existence/shape of relationships is private.
- Tags: `["alt", "SoulGraph relationship edge"]`.

### Kind `38881` — Permission grant record (addressable)

The owner's own record of a grant's current state and audit trail. Addressable so the
latest state replaces the previous (while the append-only audit trail lives inside the
encrypted content).

- `d`: opaque random identifier for the grant.
- `content`: NIP-44-encrypted-to-self JSON: `{ grants[], state, scope, granted_at,
  expires_at?, revoked_at?, audit[] }`.
- Tags: `["alt", "SoulGraph permission grant record"]`.

### Kind `7481` — Grant delivery payload (regular, gift-wrapped)

The payload delivered to a grantee, carrying the wrapped content keys for the facets
they may read. **Always** transmitted inside a **NIP-59 gift wrap** — kind `7481` is the
inner rumor kind, never published in the clear.

- `content`: JSON `{ facet_envelopes: [{ coordinate, wrapped_key }], grants[], scope }`
  where `wrapped_key` is the content key NIP-44-wrapped **to the grantee**.
- Tags: `["alt", "SoulGraph grant delivery"]`.

---

## Payment & entitlement tags (NIP-57)

SoulGraph purchases are **NIP-57 zaps** from the buyer to the configured
SoulGraph provider pubkey. The zap **request** (kind `9734`, signed by the buyer
and embedded by the LNURL service in the kind `9735` receipt) carries SoulGraph
tags so an entitlement can be verified against the exact product and price:

| Tag | Meaning |
| --- | --- |
| `soulgraph_product` | Product id from `src/config/catalog.ts` (e.g. `complete_soulgraph`). |
| `soulgraph_price_version` | Price version the product was bought at. |
| `soulgraph_ref` | First-touch referral code (the referrer's npub). Self-referrals are omitted. |
| `soulgraph_utm_source` / `_medium` / `_campaign` / `_content` / `_term` | Campaign attribution, carried verbatim. |

An entitlement (`ZapReceiptEntitlementProvider`) is valid when a kind `9735`
receipt exists, signed by the provider's receipt-signing pubkey (the LNURL
endpoint's `nostrPubkey`), whose embedded zap request is signed by the current
user, carries the matching `soulgraph_product` (and compatible
`soulgraph_price_version`), and whose paid amount meets the product price within
a configurable tolerance (`ENTITLEMENT_AMOUNT_TOLERANCE`). Receipts are cached in
the vault and re-verified against relays on new devices.

> These are multi-letter tags: they are **not** relay-indexed, and that is
> intentional. Receipts are discovered by the single-letter `p` tag (recipient =
> SoulGraph provider), then the SoulGraph tags are checked client-side during
> verification. Attribution is a private fact between buyer and provider, not a
> public discovery surface.

---

## Revocation

Per `docs/ARCHITECTURE.md §8`: stop delivering future versions, rotate affected facet
keys, re-wrap for remaining grantees, publish **NIP-09** deletions for superseded grant
events, and append to the audit trail. Nostr cannot retract already-decrypted data, and
the UI says so.
