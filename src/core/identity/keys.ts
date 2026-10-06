/**
 * Local key utilities (Identity layer).
 *
 * Browser-side keypair generation and NIP-49 (ncryptsec) encryption/decryption.
 * Anonymous identities generate a keypair here and store it via the login layer
 * (nsec login). The server never sees any key — there is no server.
 *
 * Pure TypeScript. No React imports.
 */

import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';
import * as nip49 from 'nostr-tools/nip49';

export interface GeneratedKey {
  /** Raw 32-byte secret key. */
  sk: Uint8Array;
  /** bech32 nsec. */
  nsec: string;
  /** hex public key. */
  pubkey: string;
  /** bech32 npub. */
  npub: string;
}

/** Generate a fresh keypair in the browser. */
export function generateIdentity(): GeneratedKey {
  const sk = generateSecretKey();
  const pubkey = getPublicKey(sk);
  return {
    sk,
    nsec: nip19.nsecEncode(sk),
    pubkey,
    npub: nip19.npubEncode(pubkey),
  };
}

/** Decode an nsec string into its raw secret key, or throw. */
export function decodeNsec(nsec: string): Uint8Array {
  const decoded = nip19.decode(nsec);
  if (decoded.type !== 'nsec') throw new Error('Not an nsec key.');
  return decoded.data;
}

/**
 * Encrypt a secret key with a passphrase, producing an NIP-49 `ncryptsec1…`
 * string. Safe to store or back up; useless without the passphrase.
 */
export function encryptToNcryptsec(sk: Uint8Array, passphrase: string): string {
  return nip49.encrypt(sk, passphrase);
}

/** Decrypt an NIP-49 `ncryptsec1…` string back into a raw secret key. */
export function decryptNcryptsec(ncryptsec: string, passphrase: string): Uint8Array {
  return nip49.decrypt(ncryptsec, passphrase);
}

/** Convert a raw secret key to an nsec string. */
export function skToNsec(sk: Uint8Array): string {
  return nip19.nsecEncode(sk);
}
