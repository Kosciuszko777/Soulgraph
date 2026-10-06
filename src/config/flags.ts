/**
 * SoulGraph — development/feature flags (configuration layer).
 *
 * These flags let us build an experience ahead of the machinery that will
 * ultimately gate it. The Complete SoulGraph (€4.99) is the acquisition
 * product; Prompt 5 will gate it behind a verifiable entitlement (a NIP-57 zap
 * receipt). Until then we build it ungated behind a development flag so the
 * whole experience can be designed and tested.
 *
 * Nothing in this file imports React. It is plain configuration.
 */

/**
 * When TRUE, the Complete SoulGraph is gated behind a verifiable entitlement (a
 * NIP-57 zap receipt from the configured provider). When FALSE, it is ungated —
 * anyone signed in can take the full assessment and see complete results.
 *
 * Prompt 5 flips this to TRUE: real payment + entitlement verification is now
 * in place. The UI reads it through `useEntitlement` so the gating logic lives
 * in one place. Set to FALSE only for local development without a wallet.
 */
export const COMPLETE_SOULGRAPH_GATED = true;

/** Product id (see src/config/catalog.ts) that the Complete experience unlocks. */
export const COMPLETE_PRODUCT_ID = 'complete_soulgraph';
