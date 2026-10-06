/**
 * EvidenceBadge — the honest provenance label that MUST accompany every insight.
 *
 * Three — and only three — labels (docs/SOULGRAPH.md "Ethical boundaries"):
 *   psychometric · interpretive · experimental
 *
 * The colour only distinguishes them; it never implies "better" or "worse".
 */

import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/useI18n';
import type { EvidenceLabel } from '@/core/graph/schema';

const badge = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[0.625rem] font-medium uppercase tracking-[0.18em]',
  {
    variants: {
      evidence: {
        psychometric: 'border-chart-5/40 bg-chart-5/10 text-chart-5',
        interpretive: 'border-cyan/40 bg-cyan/10 text-cyan',
        experimental: 'border-chart-4/40 bg-chart-4/10 text-chart-4',
      },
    },
  },
);

export function EvidenceBadge({
  evidence,
  className,
}: {
  evidence: EvidenceLabel;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <span
      className={cn(badge({ evidence }), className)}
      title={t(`evidence.${evidence}`)}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {t(`evidence.${evidence}`)}
    </span>
  );
}
