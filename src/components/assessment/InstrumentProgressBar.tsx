/**
 * InstrumentProgressBar — per-instrument completion for the full assessment.
 *
 * Shows each instrument as a small labelled bar so the user can see how far
 * they've come and what remains, across pause/resume sessions.
 */

import { Check } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import type { InstrumentProgress } from '@/hooks/useAssessment';

export function InstrumentProgressBar({
  instruments,
}: {
  instruments: InstrumentProgress[];
}) {
  const { t } = useI18n();

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {instruments.map((inst) => {
        const pct = inst.planned > 0 ? Math.round((inst.answered / inst.planned) * 100) : 0;
        const complete = inst.answered >= inst.planned && inst.planned > 0;
        return (
          <div key={inst.instrument_id} className="rounded-lg border border-hairline bg-card/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">{t(inst.name_key)}</span>
              {complete ? (
                <Check className="h-4 w-4 flex-shrink-0 text-primary" aria-label="complete" />
              ) : (
                <span className="atlas-data text-xs text-muted-foreground">
                  {inst.answered}/{inst.planned}
                </span>
              )}
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-primary/15">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
