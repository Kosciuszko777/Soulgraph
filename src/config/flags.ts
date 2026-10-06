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
 * When FALSE, the Complete SoulGraph is ungated — anyone signed in can take the
 * full assessment and see complete results. Prompt 5 flips this to TRUE and
 * reads a real entitlement.
 *
 * NOTE: this is the single switch Prompt 5 edits. The UI reads it through
 * `useEntitlement` so the gating logic lives in one place.
 */
export const COMPLETE_SOULGRAPH_GATED = false;

/** Product id (see src/config/catalog.ts) that the Complete experience unlocks. */
export const COMPLETE_PRODUCT_ID = 'complete_soulgraph';
