/**
 * Facet envelope cryptography (Vault layer).
 *
 * Each facet of each SoulGraph version is sealed independently:
 *   1. a fresh random 256-bit content key is generated,
 *   2. the facet payload is encrypted with AES-256-GCM (WebCrypto),
 *   3. the content key is wrapped with NIP-44 v2 — to the owner for storage,
 *      and to a grantee's pubkey when a permission is granted.
 *
 * This is what makes granular permissions and cheap revocation possible: to
 * revoke, rotate one facet's content key and re-wrap for the remaining
 * grantees. See docs/ARCHITECTURE.md §4.
 *
 * Pure TypeScript. No React imports. The only external dependency is a
 * `KeyWrapper` (satisfied by SoulSigner) so this module stays testable with any
 * NIP-44-capable signer.
 */

/** Interface for wrapping/unwrapping content keys with NIP-44. */
export interface KeyWrapper {
  /** NIP-44 encrypt plaintext to a recipient pubkey. */
  nip44Encrypt(recipientPubkey: string, plaintext: string): Promise<string>;
  /** NIP-44 decrypt ciphertext from a sender pubkey. */
  nip44Decrypt(senderPubkey: string, ciphertext: string): Promise<string>;
}

/**
 * A sealed facet. This — and only this — is what may ever be persisted or
 * published. It contains no plaintext.
 */
export interface FacetEnvelope {
  /** Encryption algorithm marker (future-proofing). */
  alg: 'AES-256-GCM';
  /** Base64 AES-GCM IV (96-bit). */
  iv: string;
  /** Base64 AES-GCM ciphertext (includes the GCM tag). */
  ciphertext: string;
  /**
   * The content key, NIP-44-wrapped per recipient pubkey. Always includes the
   * owner (for self-storage); gains entries as grants are issued.
   */
  wrapped_keys: Record<string, string>;
}

const te = new TextEncoder();
const td = new TextDecoder();

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Generate a fresh random 256-bit content key, returned as raw bytes. */
export function generateContentKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

async function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  // Copy into a fresh ArrayBuffer-backed view to satisfy BufferSource typing.
  const buf = raw.slice();
  return crypto.subtle.importKey('raw', buf, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * Seal a facet: encrypt its JSON payload with a fresh content key, then wrap
 * that key to the owner (and optionally to additional grantees).
 *
 * @param payload     the facet object to seal (will be JSON-serialized)
 * @param ownerPubkey the owner's pubkey (content key is always wrapped to self)
 * @param wrapper     a NIP-44 key wrapper (SoulSigner)
 * @param grantees    optional additional pubkeys to wrap the key for
 */
export async function sealFacet(
  payload: unknown,
  ownerPubkey: string,
  wrapper: KeyWrapper,
  grantees: string[] = [],
): Promise<FacetEnvelope> {
  const contentKey = generateContentKey();
  const key = await importAesKey(contentKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = te.encode(JSON.stringify(payload));

  const ctBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext,
  );

  const contentKeyB64 = toBase64(contentKey);
  const recipients = Array.from(new Set([ownerPubkey, ...grantees]));
  const wrapped_keys: Record<string, string> = {};
  for (const recipient of recipients) {
    wrapped_keys[recipient] = await wrapper.nip44Encrypt(recipient, contentKeyB64);
  }

  return {
    alg: 'AES-256-GCM',
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ctBuf)),
    wrapped_keys,
  };
}

/**
 * Open a sealed facet as `readerPubkey`: unwrap the content key addressed to
 * that reader (self for stored envelopes) and decrypt the payload.
 *
 * @throws if no wrapped key exists for the reader, or if decryption fails
 *         (wrong key / tampered ciphertext).
 */
export async function openFacet<T = unknown>(
  envelope: FacetEnvelope,
  readerPubkey: string,
  wrapper: KeyWrapper,
): Promise<T> {
  const wrapped = envelope.wrapped_keys[readerPubkey];
  if (!wrapped) {
    throw new Error('No wrapped content key for this reader.');
  }

  const contentKeyB64 = await wrapper.nip44Decrypt(readerPubkey, wrapped);
  const contentKey = fromBase64(contentKeyB64);
  const key = await importAesKey(contentKey);
  const iv = fromBase64(envelope.iv);
  const ciphertext = fromBase64(envelope.ciphertext);

  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );
  return JSON.parse(td.decode(new Uint8Array(plainBuf))) as T;
}

/**
 * Re-wrap an existing envelope's content key for an additional grantee, WITHOUT
 * re-encrypting the payload. The owner must be able to unwrap the key first.
 *
 * Returns a new envelope with the grantee added to `wrapped_keys`.
 */
export async function rewrapForGrantee(
  envelope: FacetEnvelope,
  ownerPubkey: string,
  granteePubkey: string,
  wrapper: KeyWrapper,
): Promise<FacetEnvelope> {
  const ownerWrapped = envelope.wrapped_keys[ownerPubkey];
  if (!ownerWrapped) {
    throw new Error('Owner cannot unwrap this envelope to re-wrap it.');
  }
  const contentKeyB64 = await wrapper.nip44Decrypt(ownerPubkey, ownerWrapped);
  const granteeWrapped = await wrapper.nip44Encrypt(granteePubkey, contentKeyB64);

  return {
    ...envelope,
    wrapped_keys: { ...envelope.wrapped_keys, [granteePubkey]: granteeWrapped },
  };
}

/**
 * Rotate a facet's content key: decrypt the payload with the old key, then seal
 * it again with a brand-new key, re-wrapping only for the given recipients.
 *
 * This is the cryptographic heart of revocation: a revoked grantee simply is
 * not included in `keepGrantees`, so the rotated envelope's content key is
 * never wrapped to them. See docs/ARCHITECTURE.md §8.
 */
export async function rotateFacetKey(
  envelope: FacetEnvelope,
  ownerPubkey: string,
  wrapper: KeyWrapper,
  keepGrantees: string[] = [],
): Promise<FacetEnvelope> {
  const payload = await openFacet<unknown>(envelope, ownerPubkey, wrapper);
  return sealFacet(payload, ownerPubkey, wrapper, keepGrantees);
}
