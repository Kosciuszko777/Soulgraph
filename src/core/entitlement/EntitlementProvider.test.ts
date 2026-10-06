import { describe, it, expect } from 'vitest';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import {
  verifyReceipt,
  normalizeQuery,
  ZapReceiptEntitlementProvider,
  type RelayQuery,
} from './EntitlementProvider';
import {
  buildZapRequest,
  ZAP_TAG_PRODUCT,
  ZAP_TAG_PRICE_VERSION,
} from '@/core/payment/zapRequest';

/* ----------------------------- fixture helpers ---------------------------- */

const PRODUCT = 'complete_soulgraph';
const PRICE_VERSION = '2026.01';
/** Expected price: 5000 sats. Tolerance ±15% → min 4250 sats. */
const EXPECTED_SATS = 5000;

const buyerSk = generateSecretKey();
const buyerPk = getPublicKey(buyerSk);
const providerSk = generateSecretKey(); // receipt signer
const providerPk = getPublicKey(providerSk);
const recipientPk = getPublicKey(generateSecretKey()); // SoulGraph recipient `p`
const strangerSk = generateSecretKey();

function signZapRequest(opts: {
  sk?: Uint8Array;
  product?: string;
  priceVersion?: string;
  amountMsat?: number;
}): NostrEvent {
  const template = buildZapRequest({
    recipientPubkey: recipientPk,
    amountMsat: opts.amountMsat ?? EXPECTED_SATS * 1000,
    relays: ['wss://relay.example'],
    productId: opts.product ?? PRODUCT,
    priceVersion: opts.priceVersion ?? PRICE_VERSION,
  });
  return finalizeEvent(template, opts.sk ?? buyerSk) as NostrEvent;
}

function signReceipt(opts: {
  zapRequest: NostrEvent;
  signerSk?: Uint8Array;
  recipient?: string;
  paidMsat?: number;
}): NostrEvent {
  const paidMsat = opts.paidMsat ?? EXPECTED_SATS * 1000;
  const template = {
    kind: 9735,
    created_at: Math.floor(Date.now() / 1000),
    content: '',
    tags: [
      ['p', opts.recipient ?? recipientPk],
      ['amount', String(paidMsat)],
      ['description', JSON.stringify(opts.zapRequest)],
    ],
  };
  return finalizeEvent(template, opts.signerSk ?? providerSk) as NostrEvent;
}

const verifyConfig = {
  receiptSignerPubkey: providerPk,
  recipientPubkey: recipientPk,
  tolerance: 0.15,
  expectedSats: async () => EXPECTED_SATS,
};

const query = normalizeQuery({ owner_pubkey: buyerPk, product_id: PRODUCT });

/* --------------------------------- tests ---------------------------------- */

describe('verifyReceipt', () => {
  it('accepts a valid receipt', async () => {
    const zapRequest = signZapRequest({});
    const receipt = signReceipt({ zapRequest });
    const entitlement = await verifyReceipt(receipt, query, verifyConfig);
    expect(entitlement).not.toBeNull();
    expect(entitlement).toMatchObject({
      product_id: PRODUCT,
      owner_pubkey: buyerPk,
      source: 'zap_receipt',
      proof_ref: receipt.id,
    });
  });

  it('rejects a receipt signed by the wrong signer', async () => {
    const zapRequest = signZapRequest({});
    const receipt = signReceipt({ zapRequest, signerSk: strangerSk });
    expect(await verifyReceipt(receipt, query, verifyConfig)).toBeNull();
  });

  it('rejects a receipt for the wrong product', async () => {
    const zapRequest = signZapRequest({ product: 'deep_soulgraph' });
    const receipt = signReceipt({ zapRequest });
    expect(await verifyReceipt(receipt, query, verifyConfig)).toBeNull();
  });

  it('rejects a receipt with an insufficient amount', async () => {
    const zapRequest = signZapRequest({});
    // Pay only 50% of the expected price — below the 15% tolerance floor.
    const receipt = signReceipt({ zapRequest, paidMsat: EXPECTED_SATS * 1000 * 0.5 });
    expect(await verifyReceipt(receipt, query, verifyConfig)).toBeNull();
  });

  it('accepts an amount within tolerance (−10%)', async () => {
    const zapRequest = signZapRequest({});
    const receipt = signReceipt({ zapRequest, paidMsat: EXPECTED_SATS * 1000 * 0.9 });
    expect(await verifyReceipt(receipt, query, verifyConfig)).not.toBeNull();
  });

  it('rejects a foreign zap request (signed by someone else)', async () => {
    const zapRequest = signZapRequest({ sk: strangerSk });
    const receipt = signReceipt({ zapRequest });
    expect(await verifyReceipt(receipt, query, verifyConfig)).toBeNull();
  });

  it('rejects a receipt addressed to the wrong recipient', async () => {
    const zapRequest = signZapRequest({});
    const receipt = signReceipt({ zapRequest, recipient: getPublicKey(generateSecretKey()) });
    expect(await verifyReceipt(receipt, query, verifyConfig)).toBeNull();
  });

  it('rejects a receipt with a tampered embedded zap request', async () => {
    const zapRequest = signZapRequest({});
    // Tamper: flip the product tag AFTER signing → signature no longer valid.
    const tampered: NostrEvent = {
      ...zapRequest,
      tags: zapRequest.tags.map((tag) =>
        tag[0] === ZAP_TAG_PRODUCT ? [ZAP_TAG_PRODUCT, 'deep_soulgraph'] : tag,
      ),
    };
    const receipt = signReceipt({ zapRequest: tampered });
    expect(await verifyReceipt(receipt, query, verifyConfig)).toBeNull();
  });

  it('rejects a receipt whose zap request has a mismatched price version', async () => {
    const zapRequest = signZapRequest({ priceVersion: '1999.01' });
    const receipt = signReceipt({ zapRequest });
    const strict = normalizeQuery({
      owner_pubkey: buyerPk,
      product_id: PRODUCT,
      price_version: PRICE_VERSION,
    });
    expect(await verifyReceipt(receipt, strict, verifyConfig)).toBeNull();
  });

  it('stamps the price version onto the zap request', () => {
    const zapRequest = signZapRequest({});
    const pv = zapRequest.tags.find(([n]) => n === ZAP_TAG_PRICE_VERSION)?.[1];
    expect(pv).toBe(PRICE_VERSION);
  });
});

describe('ZapReceiptEntitlementProvider', () => {
  function providerWith(receipts: NostrEvent[]): ZapReceiptEntitlementProvider {
    const relay: RelayQuery = {
      query: async () => receipts,
    };
    return new ZapReceiptEntitlementProvider({ relay, ...verifyConfig });
  }

  it('finds a valid entitlement among a mix of receipts', async () => {
    const good = signReceipt({ zapRequest: signZapRequest({}) });
    const wrongSigner = signReceipt({ zapRequest: signZapRequest({}), signerSk: strangerSk });
    const provider = providerWith([wrongSigner, good]);
    const entitlement = await provider.verify({ owner_pubkey: buyerPk, product_id: PRODUCT });
    expect(entitlement?.proof_ref).toBe(good.id);
  });

  it('returns null when no receipt matches', async () => {
    const provider = providerWith([signReceipt({ zapRequest: signZapRequest({ sk: strangerSk }) })]);
    expect(await provider.verify({ owner_pubkey: buyerPk, product_id: PRODUCT })).toBeNull();
  });

  it('lists verified entitlements by product', async () => {
    const good = signReceipt({ zapRequest: signZapRequest({}) });
    const provider = providerWith([good]);
    const list = await provider.list(buyerPk);
    expect(list).toHaveLength(1);
    expect(list[0].product_id).toBe(PRODUCT);
  });
});
