/**
 * SoulSigner — the single crypto adapter (Identity layer).
 *
 * ALL cryptography in SoulGraph flows through this adapter. It wraps whatever
 * Nostrify signer is active (local nsec, NIP-07 extension, NIP-46 remote
 * signer) and exposes exactly four operations the rest of the app may use:
 * getPublicKey, signEvent, nip44.encrypt, nip44.decrypt.
 *
 * Remote signers (NIP-46) can be slow, so every operation is wrapped with a
 * timeout and never assumes synchronous completion. Callers get a clear error
 * instead of a hung promise. See docs/ARCHITECTURE.md §4, §6.
 *
 * Pure TypeScript. No React imports (a hook wraps this for the UI).
 */

import type { NostrEvent } from '@nostrify/nostrify';

/** A Nostr event template (unsigned). */
export interface UnsignedEvent {
  kind: number;
  content: string;
  tags: string[][];
  created_at: number;
}

/**
 * The minimal signer contract SoulSigner depends on. Nostrify's NUser.signer
 * satisfies this (local, extension, and bunker signers all implement it).
 */
export interface NostrifySignerLike {
  getPublicKey(): Promise<string>;
  signEvent(event: UnsignedEvent): Promise<NostrEvent>;
  nip44?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
}

/** Thrown when a signer operation exceeds its timeout (e.g. an idle bunker). */
export class SignerTimeoutError extends Error {
  constructor(operation: string, ms: number) {
    super(`Signer operation "${operation}" timed out after ${ms}ms.`);
    this.name = 'SignerTimeoutError';
  }
}

/** Thrown when the active signer cannot perform NIP-44 (e.g. a minimal NIP-07). */
export class SignerCapabilityError extends Error {
  constructor(capability: string) {
    super(`The active signer does not support ${capability}.`);
    this.name = 'SignerCapabilityError';
  }
}

/** Default per-operation timeout. Generous enough for a human to approve on a bunker. */
export const DEFAULT_SIGNER_TIMEOUT_MS = 30_000;

async function withTimeout<T>(
  operation: string,
  ms: number,
  fn: () => Promise<T>,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new SignerTimeoutError(operation, ms)), ms);
  });
  try {
    return await Promise.race([fn(), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface SoulSignerOptions {
  /** Per-operation timeout in ms. */
  timeoutMs?: number;
}

/**
 * The SoulSigner adapter. Construct it with the active Nostrify signer and use
 * it for every signing and NIP-44 operation.
 */
export class SoulSigner {
  private readonly signer: NostrifySignerLike;
  private readonly timeoutMs: number;

  constructor(signer: NostrifySignerLike, options: SoulSignerOptions = {}) {
    this.signer = signer;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_SIGNER_TIMEOUT_MS;
  }

  /** Whether the active signer can perform NIP-44 (needed for envelopes). */
  get canEncrypt(): boolean {
    return Boolean(this.signer.nip44);
  }

  getPublicKey(): Promise<string> {
    return withTimeout('getPublicKey', this.timeoutMs, () =>
      this.signer.getPublicKey(),
    );
  }

  signEvent(event: UnsignedEvent): Promise<NostrEvent> {
    return withTimeout('signEvent', this.timeoutMs, () =>
      this.signer.signEvent(event),
    );
  }

  /**
   * NIP-44 encrypt `plaintext` to `recipientPubkey`. For envelope key-wrapping
   * to self, pass the owner's own pubkey.
   */
  nip44Encrypt(recipientPubkey: string, plaintext: string): Promise<string> {
    if (!this.signer.nip44) throw new SignerCapabilityError('NIP-44 encryption');
    const nip44 = this.signer.nip44;
    return withTimeout('nip44.encrypt', this.timeoutMs, () =>
      nip44.encrypt(recipientPubkey, plaintext),
    );
  }

  /** NIP-44 decrypt `ciphertext` from `senderPubkey` (self for stored envelopes). */
  nip44Decrypt(senderPubkey: string, ciphertext: string): Promise<string> {
    if (!this.signer.nip44) throw new SignerCapabilityError('NIP-44 decryption');
    const nip44 = this.signer.nip44;
    return withTimeout('nip44.decrypt', this.timeoutMs, () =>
      nip44.decrypt(senderPubkey, ciphertext),
    );
  }
}
