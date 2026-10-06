import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useSoulSigner } from '@/hooks/useSoulSigner';
import { VaultContext, type VaultState } from '@/contexts/VaultContext';
import type { SoulGraph } from '@/core/graph/schema';
import type { VaultIdentity } from '@/core/vault/db';
import { getIdentity, listVersions, loadFacet } from '@/core/vault/vault';
import { FACET_KEYS, type FacetKey } from '@/core/graph/schema';

/**
 * Holds decrypted SoulGraph data IN MEMORY ONLY. Locking clears it immediately.
 * Decryption requires the active signer (which the user may need to approve on
 * a remote signer), so unlock is async and tracked separately. See
 * docs/ARCHITECTURE.md §4.
 */
export function VaultProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const signer = useSoulSigner();

  const [state, setState] = useState<VaultState>('empty');
  const [identity, setIdentity] = useState<VaultIdentity | null>(null);
  const [currentGraph, setCurrentGraph] = useState<SoulGraph | null>(null);
  const [loading, setLoading] = useState(false);

  const pubkey = user?.pubkey;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!pubkey) {
      setIdentity(null);
      setState('empty');
      return;
    }
    const id = await getIdentity(pubkey);
    if (!mounted.current) return;
    setIdentity(id ?? null);
    // If we have locked data on disk but nothing decrypted, we're "locked".
    setState((prev) => (prev === 'unlocked' ? 'unlocked' : id ? 'locked' : 'empty'));
  }, [pubkey]);

  const lock = useCallback(() => {
    setCurrentGraph(null);
    setState((prev) => (prev === 'unlocked' ? 'locked' : prev));
  }, []);

  const unlock = useCallback(async () => {
    if (!pubkey || !signer) return;
    setLoading(true);
    setState('unlocking');
    try {
      const versions = await listVersions(pubkey);
      const current = versions.find((v) => v.is_current) ?? versions[versions.length - 1];
      if (!current) {
        if (!mounted.current) return;
        setCurrentGraph(null);
        setState('unlocked');
        return;
      }

      // Decrypt each facet envelope into memory. Missing facets stay null.
      const facets: Partial<Record<FacetKey, unknown>> = {};
      for (const facet of FACET_KEYS) {
        if (facet === 'identity') continue;
        const value = await loadFacet(pubkey, current.version_id, facet, signer);
        if (value) facets[facet] = value;
      }

      const graph: SoulGraph = {
        soulgraph_version: '1.0',
        identity: { pubkey, display_name: identity?.display_name },
        jung: (facets.jung as SoulGraph['jung']) ?? null,
        ocean: (facets.ocean as SoulGraph['ocean']) ?? null,
        enneagram: (facets.enneagram as SoulGraph['enneagram']) ?? null,
        human_design: (facets.human_design as SoulGraph['human_design']) ?? null,
        life_pattern: (facets.life_pattern as SoulGraph['life_pattern']) ?? null,
        worldview: (facets.worldview as SoulGraph['worldview']) ?? null,
        soulgraph_core: (facets.soulgraph_core as SoulGraph['soulgraph_core']) ?? null,
        confidence: { overall: 0, per_facet: {} },
        provenance: {
          responses_hash: '0'.repeat(64),
          engine_version: '',
          instrument_versions: {},
          assessment_run_id: current.version_id,
        },
        created_at: current.created_at,
      };

      if (!mounted.current) return;
      setCurrentGraph(graph);
      setState('unlocked');
    } catch (err) {
      console.error('Vault unlock failed:', err);
      if (mounted.current) {
        setCurrentGraph(null);
        setState('locked');
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [pubkey, signer, identity?.display_name]);

  // Re-read identity whenever the active user changes. Always lock on change.
  useEffect(() => {
    setCurrentGraph(null);
    void refresh();
  }, [refresh]);

  // Defensive: clear decrypted memory when the tab is hidden for a long time?
  // We keep it simple — explicit lock only — but clear on logout (pubkey loss).
  useEffect(() => {
    if (!pubkey) {
      setCurrentGraph(null);
      setState('empty');
    }
  }, [pubkey]);

  return (
    <VaultContext.Provider
      value={{ state, identity, currentGraph, loading, unlock, lock, refresh }}
    >
      {children}
    </VaultContext.Provider>
  );
}
