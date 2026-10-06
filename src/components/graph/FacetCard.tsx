/**
 * FacetCard — one facet of the canonical SoulGraph.
 *
 * Carries the facet's evidence label (always), an optional honest note, and its
 * scales. A facet is only shown when it was actually filled — never as an empty
 * zeroed shell.
 */

import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EvidenceBadge } from '@/components/assessment/EvidenceBadge';
import type { EvidenceLabel } from '@/core/graph/schema';

export function FacetCard({
  title,
  evidence,
  note,
  headline,
  children,
}: {
  title: string;
  evidence: EvidenceLabel;
  note?: string;
  /** Optional derived summary (e.g. a type code), shown prominently. */
  headline?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="border-hairline bg-card/60">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-xl">{title}</h3>
          <EvidenceBadge evidence={evidence} />
        </div>
        {headline}
        {note && (
          <p className="text-sm leading-relaxed text-muted-foreground">{note}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  );
}
