import { describe, it, expect } from 'vitest';
import { NSecSigner } from '@nostrify/nostrify';
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import {
  sealFacet,
  openFacet,
  rewrapForGrantee,
  rotateFacetKey,
  type KeyWrapper,
} from './envelope';

/** Wrap an NSecSigner as a KeyWrapper (SoulSigner does the same in the app). */
function wrapperFor(sk: Uint8Array): { wrapper: KeyWrapper; pubkey: string } {
  const signer = new NSecSigner(sk);
  const pubkey = getPublicKey(sk);
  const wrapper: KeyWrapper = {
    nip44Encrypt: (recipient, plaintext) => signer.nip44.encrypt(recipient, plaintext),
    nip44Decrypt: (sender, ciphertext) => signer.nip44.decrypt(sender, ciphertext),
  };
  return { wrapper, pubkey };
}

describe('facet envelope crypto', () => {
  it('seals and opens a facet round-trip', async () => {
    const { wrapper, pubkey } = wrapperFor(generateSecretKey());
    const payload = { scales: { O: { value: 72 } }, note: 'hello' };

    const envelope = await sealFacet(payload, pubkey, wrapper);

    // The envelope carries no plaintext.
    expect(envelope.ciphertext).not.toContain('hello');
    expect(JSON.stringify(envelope)).not.toContain('hello');
    expect(Object.keys(envelope.wrapped_keys)).toEqual([pubkey]);

    const opened = await openFacet(envelope, pubkey, wrapper);
    expect(opened).toEqual(payload);
  });

  it('fails to open with the wrong key', async () => {
    const owner = wrapperFor(generateSecretKey());
    const stranger = wrapperFor(generateSecretKey());

    const envelope = await sealFacet({ secret: 42 }, owner.pubkey, owner.wrapper);

    // The stranger has no wrapped key at all.
    await expect(
      openFacet(envelope, stranger.pubkey, stranger.wrapper),
    ).rejects.toThrow();
  });

  it('re-wraps for a grantee without re-encrypting the payload', async () => {
    const owner = wrapperFor(generateSecretKey());
    const granteeSk = generateSecretKey();
    const grantee = wrapperFor(granteeSk);

    const envelope = await sealFacet({ v: 'shared' }, owner.pubkey, owner.wrapper);
    const shared = await rewrapForGrantee(
      envelope,
      owner.pubkey,
      grantee.pubkey,
      owner.wrapper,
    );

    // Ciphertext is identical; only a new wrapped key was added.
    expect(shared.ciphertext).toBe(envelope.ciphertext);
    expect(Object.keys(shared.wrapped_keys).sort()).toEqual(
      [owner.pubkey, grantee.pubkey].sort(),
    );

    // The grantee can now open it.
    const opened = await openFacet(shared, grantee.pubkey, grantee.wrapper);
    expect(opened).toEqual({ v: 'shared' });
  });

  it('rotates the content key and locks out revoked grantees', async () => {
    const owner = wrapperFor(generateSecretKey());
    const grantee = wrapperFor(generateSecretKey());

    // Share, then rotate keeping nobody (revocation).
    const sealed = await sealFacet({ v: 'rotate' }, owner.pubkey, owner.wrapper);
    const shared = await rewrapForGrantee(sealed, owner.pubkey, grantee.pubkey, owner.wrapper);

    // Grantee can read the shared envelope.
    expect(await openFacet(shared, grantee.pubkey, grantee.wrapper)).toEqual({ v: 'rotate' });

    const rotated = await rotateFacetKey(shared, owner.pubkey, owner.wrapper, []);

    // New ciphertext and no wrapped key for the revoked grantee.
    expect(rotated.ciphertext).not.toBe(shared.ciphertext);
    expect(Object.keys(rotated.wrapped_keys)).toEqual([owner.pubkey]);

    // Owner still reads it; revoked grantee cannot.
    expect(await openFacet(rotated, owner.pubkey, owner.wrapper)).toEqual({ v: 'rotate' });
    await expect(
      openFacet(rotated, grantee.pubkey, grantee.wrapper),
    ).rejects.toThrow();
  });
});
