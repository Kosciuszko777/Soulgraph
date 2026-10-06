import { useEffect, useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { listVersions } from '@/core/vault/vault';

export interface VersionMeta {
  /** 1-based human version number of the current graph. */
  number: number;
  /** Total versions in the owner's history. */
  total: number;
}

/** Read lightweight version metadata (number + total) without decrypting facets. */
export function useVersionMeta(): VersionMeta | null {
  const { user } = useCurrentUser();
  const [meta, setMeta] = useState<VersionMeta | null>(null);

  useEffect(() => {
    if (!user?.pubkey) {
      setMeta(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const versions = await listVersions(user.pubkey);
      if (cancelled) return;
      const currentIndex = versions.findIndex((v) => v.is_current);
      const idx = currentIndex === -1 ? versions.length - 1 : currentIndex;
      setMeta({ number: idx + 1, total: versions.length });
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.pubkey]);

  return meta;
}
