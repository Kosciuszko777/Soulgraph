/**
 * useAssessment — the assessment runner (Experience → Engine → Vault).
 *
 * Supports two modes:
 *   - 'demo': the 15-item taster. Simple, no resume.
 *   - 'full': the Complete SoulGraph. Carries prior answers so no item is ever
 *     re-asked, saves progress encrypted after every answer (pause & resume),
 *     and reports per-instrument progress.
 *
 * On completion it scores the merged responses with the deterministic engine,
 * seals each facet, and persists a NEW immutable version (never overwriting the
 * last). The engine never runs on a server and the LLM never scores anything —
 * all of this is local, deterministic, and on-device. See docs/ARCHITECTURE.md.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useSoulSigner } from '@/hooks/useSoulSigner';
import { useVault } from '@/hooks/useVault';
import {
  collectAssessmentItems,
  INSTRUMENTS,
  type PresentedItem,
} from '@/core/engine/instruments';
import { buildSoulGraph } from '@/core/engine/buildSoulGraph';
import type { ItemResponse, ResponseSet } from '@/core/engine/types';
import type { SoulGraphVersion } from '@/core/graph/schema';
import {
  clearProgress,
  listVersions,
  loadPriorAnswers,
  loadProgress,
  randomId,
  saveGraphVersion,
  saveProgress,
  saveSession,
} from '@/core/vault/vault';

export type AssessmentMode = 'demo' | 'full';

/** Per-instrument progress for the "continue where you left off" display. */
export interface InstrumentProgress {
  instrument_id: string;
  name_key: string;
  evidence: PresentedItem['instrument']['evidence'];
  answered: number;
  planned: number;
}

export interface UseAssessmentResult {
  /** Still loading prior answers / draft from the vault (full mode). */
  initializing: boolean;
  /** Items the user still needs to answer in this run (unanswered only). */
  items: PresentedItem[];
  /** item_id → answered value for THIS run's remaining items. */
  answers: Record<string, number>;
  /** Record an answer (also persists the draft in full mode). */
  answer: (itemId: string, value: number) => void;
  /** Remaining-item answered count (for this run). */
  answeredCount: number;
  /** Remaining-item total (for this run). */
  total: number;
  /** Per-instrument progress across prior + current answers. */
  instrumentProgress: InstrumentProgress[];
  /** True when every remaining item has an answer. */
  complete: boolean;
  /** Whether a completion (score + seal + persist) is in flight. */
  saving: boolean;
  /** The last error from completion, if any. */
  error: string | null;
  /** Whether the active signer can encrypt (required to persist). */
  canPersist: boolean;
  /** Whether this run resumed an existing draft. */
  resumed: boolean;
  /** Score, seal and persist. Resolves with the new version id. */
  finish: (opts?: { birthDate?: string }) => Promise<string | null>;
}

export function useAssessment(mode: AssessmentMode): UseAssessmentResult {
  const { user } = useCurrentUser();
  const signer = useSoulSigner();
  const { refresh } = useVault();

  const isFull = mode === 'full';
  const fullBank = useMemo(() => collectAssessmentItems(false), []);
  const demoItems = useMemo(() => collectAssessmentItems(true), []);

  const [priorAnswers, setPriorAnswers] = useState<Record<string, number>>({});
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [initializing, setInitializing] = useState(isFull);
  const [resumed, setResumed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pubkey = user?.pubkey;

  // --- Load prior answers + any in-progress draft (full mode only) ---------
  useEffect(() => {
    if (!isFull) {
      setInitializing(false);
      return;
    }
    if (!pubkey || !signer?.canEncrypt) return;

    let cancelled = false;
    (async () => {
      try {
        const [prior, draft] = await Promise.all([
          loadPriorAnswers(pubkey, signer),
          loadProgress<{ answers?: Record<string, number> }>(pubkey, signer),
        ]);
        if (cancelled) return;

        const numericPrior: Record<string, number> = {};
        for (const [id, v] of Object.entries(prior)) {
          if (typeof v === 'number') numericPrior[id] = v;
        }
        setPriorAnswers(numericPrior);
        if (draft?.answers && Object.keys(draft.answers).length > 0) {
          setAnswers(draft.answers);
          setResumed(true);
        }
      } catch (err) {
        console.error('Failed to load assessment state:', err);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isFull, pubkey, signer]);

  // --- The items this run presents -----------------------------------------
  const items = useMemo(() => {
    if (!isFull) return demoItems;
    // Full bank minus anything already answered in a prior session.
    return fullBank.filter(({ item }) => priorAnswers[item.id] === undefined);
  }, [isFull, demoItems, fullBank, priorAnswers]);

  // --- Persist the draft after each answer (full mode) ---------------------
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistDraft = useCallback(
    (next: Record<string, number>) => {
      if (!isFull || !pubkey || !signer?.canEncrypt) return;
      if (draftTimer.current) clearTimeout(draftTimer.current);
      draftTimer.current = setTimeout(() => {
        void saveProgress(pubkey, { answers: next }, signer).catch((err) =>
          console.error('Failed to save assessment draft:', err),
        );
      }, 300);
    },
    [isFull, pubkey, signer],
  );

  const answer = useCallback(
    (itemId: string, value: number) => {
      setAnswers((prev) => {
        const next = { ...prev, [itemId]: value };
        persistDraft(next);
        return next;
      });
    },
    [persistDraft],
  );

  const answeredCount = Object.keys(answers).length;
  const total = items.length;
  const complete = total === 0 || answeredCount >= total;
  const canPersist = Boolean(signer?.canEncrypt);

  // --- Per-instrument progress (prior + current) ---------------------------
  const instrumentProgress = useMemo<InstrumentProgress[]>(() => {
    const answeredIds = new Set([...Object.keys(priorAnswers), ...Object.keys(answers)]);
    return INSTRUMENTS.map((inst) => {
      const planned = isFull ? inst.items.length : inst.items.filter((i) => i.demo).length;
      const answered = inst.items.filter(
        (i) => answeredIds.has(i.id) && (isFull || i.demo),
      ).length;
      return {
        instrument_id: inst.id,
        name_key: inst.name_key,
        evidence: inst.evidence,
        answered,
        planned,
      };
    });
  }, [priorAnswers, answers, isFull]);

  // --- Finish ---------------------------------------------------------------
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
        const owner = user.pubkey;

        // Merge prior + current answers into one response set.
        const merged: Record<string, number> = { ...priorAnswers, ...answers };
        const responses: ItemResponse[] = Object.entries(merged).map(([item_id, value]) => ({
          item_id,
          value,
        }));
        const set: ResponseSet = { responses, birth_date: opts?.birthDate };

        // New immutable version continues the owner's history (never overwrites).
        const previous = await listVersions(owner);
        const previousVersion = previous.length ? previous[previous.length - 1] : undefined;

        const versionId = randomId();
        const version: SoulGraphVersion = buildSoulGraph(
          set,
          { pubkey: owner, assessment_run_id: randomId(), version_id: versionId },
          previousVersion ? { sequence: previousVersion.sequence } : undefined,
        );

        await saveGraphVersion(version, signer, { makeCurrent: true });
        await saveSession(owner, set, signer, { completed: true });
        if (isFull) await clearProgress(owner);

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
    [user, signer, priorAnswers, answers, isFull, refresh],
  );

  return {
    initializing,
    items,
    answers,
    answer,
    answeredCount,
    total,
    instrumentProgress,
    complete,
    saving,
    error,
    canPersist,
    resumed,
    finish,
  };
}
