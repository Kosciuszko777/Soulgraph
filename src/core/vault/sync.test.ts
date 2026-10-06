import { describe, it, expect, vi } from 'vitest';
import { NSecSigner } from '@nostrify/nostrify';
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import { sealFacet, type KeyWrapper } from './envelope';
import {
  buildEnvelopeEvent,
  assertSealedContent,
  parseEnvelopeEvent,
} from './sync';
import type { VaultEnvelopeRecord } from './db';

function wrapperFor(sk: Uint8Array): { wrapper: KeyWrapper; pubkey: string } {
  const signer = new NSecSigner(sk);
  return {
    pubkey: getPublicKey(sk),
    wrapper: {
      nip44Encrypt: (r, p) => signer.nip44.encrypt(r, p),
      nip44Decrypt: (s, c) => signer.nip44.decrypt(s, c),
    },
  };
}

describe('vault sync safety', () => {
  it('only ever sends sealed content to a publish call', async () => {
    const { wrapper, pubkey } = wrapperFor(generateSecretKey());
    const secretPayload = { jung: { type_code: 'INTJ' }, note: 'TOP SECRET PLAINTEXT' };
    const envelope = await sealFacet(secretPayload, pubkey, wrapper);

    const record: VaultEnvelopeRecord = {
      id: `${pubkey}:v1:jung`,
      owner_pubkey: pubkey,
      version_id: 'v1',
      facet: 'jung',
      envelope,
      sync_d: 'opaque-random-id',
      updated_at: 0,
    };

    // Simulate the publish path: build the event and hand it to a spy "publish".
    const publishSpy = vi.fn(async (_event: { content: string; tags: string[][] }) => {});
    const template = buildEnvelopeEvent(record);

    // The guard must pass for sealed content, and the content must be clean.
    expect(() => assertSealedContent(template.content)).not.toThrow();
    await publishSpy(template);

    expect(publishSpy).toHaveBeenCalledTimes(1);
    const published = publishSpy.mock.calls[0][0];
    // No plaintext facet value ever appears in the published event.
    expect(published.content).not.toContain('TOP SECRET PLAINTEXT');
    expect(published.content).not.toContain('INTJ');
    // The d tag is the opaque identifier, never a descriptive facet name.
    const dTag = published.tags.find(([n]) => n === 'd')?.[1];
    expect(dTag).toBe('opaque-random-id');
    expect(published.tags.flat()).not.toContain('jung');
  });

  it('refuses to publish non-sealed (plaintext) content', () => {
    expect(() => assertSealedContent(JSON.stringify({ jung: 'plaintext' }))).toThrow();
    expect(() => assertSealedContent('not json at all')).toThrow();
  });

  it('round-trips an envelope event through parse', async () => {
    const { wrapper, pubkey } = wrapperFor(generateSecretKey());
    const envelope = await sealFacet({ v: 1 }, pubkey, wrapper);
    const record: VaultEnvelopeRecord = {
      id: 'x', owner_pubkey: pubkey, version_id: 'v1', facet: 'ocean',
      envelope, sync_d: 'abc123', updated_at: 0,
    };
    const template = buildEnvelopeEvent(record);
    const fakeEvent = {
      id: 'eid', pubkey, kind: template.kind, content: template.content,
      tags: template.tags, created_at: template.created_at, sig: 'sig',
    };
    const parsed = parseEnvelopeEvent(fakeEvent);
    expect(parsed?.sync_d).toBe('abc123');
    expect(parsed?.envelope.alg).toBe('AES-256-GCM');
  });
});
