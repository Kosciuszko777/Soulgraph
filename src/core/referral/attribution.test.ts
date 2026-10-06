import { describe, it, expect } from 'vitest';
import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';
import {
  attributionTags,
  isSelfReferral,
  parseAttribution,
  referralCodeForPubkey,
  referralLink,
  resolveRefToPubkey,
  shortReferralCode,
  type Attribution,
} from './attribution';

describe('first-touch attribution parsing', () => {
  it('captures ref + UTM params from a search string', () => {
    const attr = parseAttribution('?ref=npub1abc&utm_source=twitter&utm_campaign=launch', 1000);
    expect(attr).toMatchObject({
      ref: 'npub1abc',
      utm_source: 'twitter',
      utm_campaign: 'launch',
      captured_at: 1000,
    });
  });

  it('returns null when there is nothing to attribute', () => {
    expect(parseAttribution('?foo=bar', 1000)).toBeNull();
    expect(parseAttribution('', 1000)).toBeNull();
  });

  it('records the first-touch timestamp it is given', () => {
    const attr = parseAttribution('?ref=code', 42);
    expect(attr?.captured_at).toBe(42);
  });
});

describe('referral code resolution', () => {
  it('an npub is the referral code and resolves back to the pubkey', () => {
    const pk = getPublicKey(generateSecretKey());
    const code = referralCodeForPubkey(pk);
    expect(code).toBe(nip19.npubEncode(pk));
    expect(resolveRefToPubkey(code)).toBe(pk);
  });

  it('resolves a bare hex pubkey', () => {
    const pk = getPublicKey(generateSecretKey());
    expect(resolveRefToPubkey(pk)).toBe(pk);
  });

  it('returns null for an unresolvable code', () => {
    expect(resolveRefToPubkey('not-a-code')).toBeNull();
    expect(resolveRefToPubkey(undefined)).toBeNull();
  });

  it('shortens a code for display only', () => {
    const pk = getPublicKey(generateSecretKey());
    const code = referralCodeForPubkey(pk);
    const short = shortReferralCode(code);
    expect(short.length).toBeLessThan(code.length);
    expect(short).toContain('…');
  });

  it('builds a referral link with the ref query param', () => {
    expect(referralLink('https://soulgraph.app/', 'npub1abc')).toBe(
      'https://soulgraph.app/?ref=npub1abc',
    );
    expect(referralLink('https://soulgraph.app')).toBe('https://soulgraph.app/');
  });
});

describe('self-referral handling', () => {
  it('detects a self-referral (same pubkey)', () => {
    const pk = getPublicKey(generateSecretKey());
    const attr: Attribution = { ref: referralCodeForPubkey(pk), captured_at: 0 };
    expect(isSelfReferral(attr, pk)).toBe(true);
  });

  it('a different referrer is not a self-referral', () => {
    const me = getPublicKey(generateSecretKey());
    const them = getPublicKey(generateSecretKey());
    const attr: Attribution = { ref: referralCodeForPubkey(them), captured_at: 0 };
    expect(isSelfReferral(attr, me)).toBe(false);
  });

  it('omits the ref tag for a self-referral but keeps UTM', () => {
    const pk = getPublicKey(generateSecretKey());
    const attr: Attribution = {
      ref: referralCodeForPubkey(pk),
      utm_source: 'newsletter',
      captured_at: 0,
    };
    const tags = attributionTags(attr, pk);
    expect(tags.find(([n]) => n === 'soulgraph_ref')).toBeUndefined();
    expect(tags).toContainEqual(['soulgraph_utm_source', 'newsletter']);
  });

  it('keeps the ref tag for a genuine referral', () => {
    const me = getPublicKey(generateSecretKey());
    const them = getPublicKey(generateSecretKey());
    const refCode = referralCodeForPubkey(them);
    const attr: Attribution = { ref: refCode, captured_at: 0 };
    const tags = attributionTags(attr, me);
    expect(tags).toContainEqual(['soulgraph_ref', refCode]);
  });

  it('emits no tags for null attribution', () => {
    expect(attributionTags(null)).toEqual([]);
  });
});
