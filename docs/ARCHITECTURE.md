# SoulGraph — Technical Constitution

This is a reference, not an essay. Each section **resolves** a decision. Read
`docs/SOULGRAPH.md` first; this document assumes the product constitution.

---

## 1. System architecture

SoulGraph is a **client-only React application**. There is no application server.
Nostr is the identity, signature and (optional) sync layer; the browser is the compute
layer. Layers depend **only on the layers below them**:

```
┌──────────────────────────────────────────────┐
│ Experience   (src/pages, src/components)       │  UI
├──────────────────────────────────────────────┤
│ Interpretation (src/core/interpret, SoulAI)    │  insight rules (Phase I) → SoulAI (Phase II)
├──────────────────────────────────────────────┤
│ Graph        (src/core/graph)                  │  canonical SoulGraph + immutable versions
├──────────────────────────────────────────────┤
│ Engine       (src/core/engine)                 │  deterministic, versioned scoring (pure TS)
├──────────────────────────────────────────────┤
│ Vault        (src/core/vault)                  │  local-first encrypted store + optional sync
├──────────────────────────────────────────────┤
│ Identity     (Nostr keys / signers)            │  NIP-07 / NIP-46 / local keypair
└──────────────────────────────────────────────┘
```

**Hard rule:** everything under `src/core/engine/` and `src/core/graph/` is pure
TypeScript with **no React imports**. It must run unchanged in Node (for unit tests)
and, later, in a server or Web Worker for re-scoring. The Engine is deterministic and
versioned: the same responses + the same `engine_version` always produce the same
scores.

---

## 2. Canonical SoulGraph JSON

Defined as a versioned TypeScript type with a matching zod schema in
`src/core/graph/schema.ts`.

- `soulgraph_version: "1.0"`.
- Top-level facets: `identity`, `jung`, `ocean`, `enneagram`, `human_design`,
  `life_pattern`, `worldview`, `soulgraph_core`, plus `confidence`, `provenance`,
  `created_at`.
- **Every facet is independently nullable.** Phase I fills only `jung`, `enneagram`,
  `life_pattern`, and a partial `soulgraph_core`.
- Every **scale value** carries:

  ```ts
  {
    value: number;        // 0–100
    confidence: number;   // 0–1
    evidence: "psychometric" | "interpretive" | "experimental";
    instrument_id: string;
    instrument_version: string;
    engine_version: string;
  }
  ```

- `provenance` stores the **hash of the raw responses** and the engine version, so any
  graph can be re-scored deterministically later.
- The `identity` facet contains **only** the owner's pubkey and an optional display
  name. **Never** legal name, phone or address.

---

## 3. Versioning

SoulGraph versions are **immutable snapshots**, never overwritten. A new version is
created whenever an assessment is completed or re-taken. The **current** SoulGraph is a
pointer to the latest version. This is the foundation for "How have I changed?" and,
later, the Decision → Action → Outcome → Feedback chain.

---

## 4. Facet envelopes

> The decision that keeps Partner, Team and Organization possible.

- The SoulGraph is **never** encrypted as a single blob.
- Each **facet of each version** is encrypted **separately** with its own random
  **256-bit content key** (AES-256-GCM via WebCrypto).
- Content keys are **wrapped with NIP-44 v2**:
  - to the **owner's own pubkey** for storage, and
  - to a **grantee's pubkey** when a permission is granted.
- This enables granular permissions (`VIEW_JUNG` vs `VIEW_FULL_SOULGRAPH`) and **cheap
  revocation** (rotate one facet's key, re-wrap for the remaining grantees).
- **Derived artifacts** safe to share in aggregate (e.g. a coarse Core vector for team
  aggregation) are their **own facet type with their own key** — sharing an aggregate
  never requires sharing raw facets.

---

## 5. Storage and sync

- **Local-first.** IndexedDB is the primary store.
- **Relay sync is OFF by default**, and is an explicit **opt-in per device**.
- When enabled, encrypted envelopes are published as **addressable app-data events
  (NIP-78, kind 30078)** with **opaque `d` tags** (random identifiers, never descriptive
  strings like `"enneagram"`) so relays learn as little metadata as possible.
- **Nothing psychological is ever published unencrypted. Nothing is published to public
  relays by default.**
- The **sync relay list is separate** from the general MKStack relay list, and the UI
  recommends a **private or paid relay**.

---

## 6. Identity

Two paths, both keyless-server:

1. **Create anonymous SoulGraph** — generate a keypair in the browser, store it locally,
   and **require a backup step** (show `nsec`, offer an **NIP-49 `ncryptsec`** export
   with passphrase) **before any payment or sync**.
2. **Sign in with Nostr** — **NIP-07** browser extension and **NIP-46** remote signer
   (bunker / `nostrconnect`), via the existing MKStack login.

Email is **never required** in Phase I. The server never sees any key **because there is
no server**.

---

## 7. Permission graph and relationship graph

Modelled now, used later.

- A **Relationship** is an edge between the owner and another pubkey with a `type`:
  `person | partner | coach | team | organization`, plus a set of **Permission grants**.
- Permission grants are drawn from:
  `VIEW_JUNG`, `VIEW_OCEAN`, `VIEW_ENNEAGRAM`, `VIEW_LIFE_PATTERN`,
  `VIEW_HUMAN_DESIGN`, `VIEW_WORLDVIEW`, `VIEW_CORE`, `VIEW_FULL_SOULGRAPH`,
  `COMPARE_WITH_ME`, `PARTNER_ANALYSIS`, `COACH_ACCESS`, `TEAM_AGGREGATION`,
  `ORGANIZATION_AGGREGATION`, `AI_CONTEXT`, `REPORT_ACCESS`.
- Every grant has: `state` (`granted | limited | revoked`), `scope` (facets + versions),
  `granted_at`, optional `expires_at`, `revoked_at`, and an **append-only audit trail**.
- Grants are delivered to grantees as **NIP-59 gift-wrapped events** containing the
  wrapped content keys.
- Custom event kinds are documented in `docs/NIP-SOULGRAPH.md`.

---

## 8. Revocation, honestly

Nostr **cannot make a grantee forget** data they already decrypted. Revocation
therefore means, concretely:

1. stop delivering future versions,
2. **rotate** the affected facet keys,
3. **re-wrap** for the remaining grantees,
4. publish **NIP-09 deletion requests** for the old grant,
5. record the revocation in the **audit trail**.

**The UI must say this plainly.** We never imply we can retract what someone already saw.

---

## 9. Organization hierarchy model

```
Organization → Department → Team → Person
```

plus **Role** and **Project** memberships. Organizations are pubkeys too. An
organization **never holds an employee's private facets**; it receives only what the
employee grants — by default only `TEAM_AGGREGATION` / `ORGANIZATION_AGGREGATION`
aggregate facets. **Minimum-group thresholds (default 5)** apply to any aggregate view.
(Not built in Phase I, but the types and permissions already accommodate it.)

---

## 10. Payment and entitlement model

- Product catalog and prices live in **one config module** (`src/config/catalog.ts`),
  with **per-product currency, price, and per-product referral commission rate** — never
  a global constant.
- Payments in Phase I settle over **Lightning**.
- An **entitlement is a verifiable fact**, not a local boolean. In Phase I it is a valid
  **NIP-57 zap receipt** from the configured SoulGraph Lightning provider's pubkey, for a
  zap request signed by the **user's pubkey** and tagged with the **product id** and
  **price version**.
- `EntitlementProvider` is an **interface**, so a later issuer service (signed
  entitlement events from a SoulGraph issuer key) or a card-payment provider can be added
  **without touching UI code**.

---

## 11. Referral attribution

- **First-touch attribution** captured from `?ref=<npub or code>` plus UTM parameters,
  stored locally, **bound to the user's pubkey** when the identity is created, and carried
  as a **tag in every zap request** so attribution is recorded at payment time.
- Phase I **records attribution only**; the commission ledger and payouts come in Phase
  VII. Commission rules are **configurable per product**; marketplace commission is
  configured separately.

---

## 12. AI abstraction

Designed now, built in Phase II. A **`SoulAI`** interface with:
`chat`, `report`, `compare`, `couple`, `team`, `organization`, `simulate`, `decision`,
`retrieve`, `embed`, `summarize` — each returning typed results **plus a usage record**
(`provider`, `model`, `tokens`, `cost`, `latency`, `feature`).

Providers are interchangeable: OpenAI-compatible endpoints, Anthropic, local models,
Nostr-native pay-per-request providers. **The LLM never calculates scores; it only
interprets the canonical SoulGraph.**

---

## 13. Decisions in Phase I that protect Phases II–VIII

- **Per-facet envelopes** → enable granular sharing and team aggregation.
- **Immutable versions** → enable longitudinal and organizational history.
- **Demo items are a subset of the full item bank** → answers carry over, never re-asked.
- **Engine is pure and versioned** → enables server-side or worker re-use and re-scoring.
- **Entitlements are verifiable, not flags** → enable subscriptions, organizations and referrals.
- **Pricing and commissions are configuration** → enable admin later.
- **Identity is a pubkey, not an account row** → enables coach, team and org edges without migration.
- **Attribution captured at first touch and stamped into payments** → enables the referral ledger retroactively.
