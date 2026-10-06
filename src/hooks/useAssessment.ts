/**
 * useAssessment — the assessment runner (Experience → Engine → Vault).
 *
 * Holds the in-progress responses in memory, exposes the ordered item list and
 * progress, and on completion:
 *   1. scores the responses with the deterministic engine (buildSoulGraph),
 *   2. seals each facet into its own envelope and persists an immutable version,
 *   3. stores the raw responses as an encrypted session (never in cleartext),
 *   4. points "current" at the new version.
 *
 * The engine never runs on a server and the LLM never scores anything — all of
 * this is local, deterministic, and on-device. See docs/ARCHITECTURE.md §1–§5.
 */

import { useCallback, useMemo, useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useSoulSigner } from '@/hooks/useSoulSigner';
import { useVault } from '@/hooks/useVault';
import {
  collectAssessmentItems,
  type PresentedItem,
} from '@/core/engine/instruments';
import { buildSoulGraph } from '@/core/engine/buildSoulGraph';
import type { ItemResponse, ResponseSet } from '@/core/engine/types';
import type { SoulGraphVersion } from '@/core/graph/schema';
import {
  listVersions,
  randomId,
  saveGraphVersion,
  saveSession,
} from '@/core/vault/vault';

export type AssessmentMode = 'demo' | 'full';

export interface UseAssessmentResult {
  /** Ordered items for this run. */
  items: PresentedItem[];
  /** item_id → answered value (1..5 for the demo's Likert items). */
  answers: Record<string, number>;
  /** Record an answer for an item. */
  answer: (itemId: string, value: number) => void;
  /** How many items have been answered. */
  answeredCount: number;
  /** Total items in the run. */
  total: number;
  /** True when every item has an answer. */
  complete: boolean;
  /** Whether a completion (score + seal + persist) is in flight. */
  saving: boolean;
  /** The last error from completion, if any. */
  error: string | null;
  /** Whether the active signer can encrypt (required to persist). */
  canPersist: boolean;
  /** Score, seal and persist. Resolves with the new version id. */
  finish: (opts?: { birthDate?: string }) => Promise<string | null>;
}

export function useAssessment(mode: AssessmentMode): UseAssessmentResult {
  const { user } = useCurrentUser();
  const signer = useSoulSigner();
  const { refresh } = useVault();

  const items = useMemo(() => collectAssessmentItems(mode === 'demo'), [mode]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answer = useCallback((itemId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [itemId]: value }));
  }, []);

  const answeredCount = Object.keys(answers).length;
  const total = items.length;
  const complete = total > 0 && answeredCount >= total;
  const canPersist = Boolean(signer?.canEncrypt);

  const finish = useCallback(
    async (opts?: { birthDate?: string }): Promise<string | null> => {
      if (!user || !signer) {
        setError('You must be signed in to save your SoulGraph.');
        return null;
      }
      if (!signer.canEncrypt) {
        setError('Your signer cannot encrypt. Use an extension or key that supports NIP-44.');
        return null;
      }

      setSaving(true);
      setError(null);
      try {
        const pubkey = user.pubkey;

        const responses: ItemResponse[] = items.map(({ item }) => ({
          item_id: item.id,
          value: answers[item.id],
        }));
        const set: ResponseSet = {
          responses,
          birth_date: opts?.birthDate,
        };

        // Sequence continues the owner's immutable history.
        const previous = await listVersions(pubkey);
        const previousVersion = previous.length
          ? previous[previous.length - 1]
          : undefined;

        const versionId = randomId();
        const version: SoulGraphVersion = buildSoulGraph(
          set,
          {
            pubkey,
            assessment_run_id: randomId(),
            version_id: versionId,
          },
          previousVersion ? { sequence: previousVersion.sequence } : undefined,
        );

        // Seal facets + persist the immutable version, then store raw responses.
        await saveGraphVersion(version, signer, { makeCurrent: true });
        await saveSession(pubkey, set, signer, { completed: true });

        await refresh();
        return versionId;
      } catch (err) {
        console.error('Assessment completion failed:', err);
        setError(err instanceof Error ? err.message : 'Could not save your SoulGraph.');
        return null;
      } finally {
        setSaving(false);
      }
    },
    [user, signer, items, answers, refresh],
  );

  return {
    items,
    answers,
    answer,
    answeredCount,
    total,
    complete,
    saving,
    error,
    canPersist,
    finish,
  };
}
