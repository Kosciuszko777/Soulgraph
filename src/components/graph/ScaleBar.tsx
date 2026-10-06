/**
 * ScaleBar — one measured scale, rendered honestly.
 *
 * Shows the 0–100 value as a bar plus a small confidence readout. Values are
 * "scaled, not population-normed" — the surrounding facet copy says so, and we
 * never render a value as a percentile or a verdict.
 *
 * `poles` turns the bar bipolar (e.g. Jungian axes: Introvert ←→ Extravert),
 * placing a marker along the axis instead of filling from the left.
 */

import { cn } from '@/lib/utils';

export function ScaleBar({
  label,
  description,
  value,
  confidence,
  poles,
}: {
  label: string;
  description?: string;
  value: number;
  confidence: number;
  poles?: { low: string; high: string };
}) {
  const pct = Math.max(0, Math.min(100, value));
  const confPct = Math.round(confidence * 100);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{label}</span>
        <span className="atlas-data text-sm text-muted-foreground">{Math.round(pct)}</span>
      </div>

      {poles ? (
        <div className="mt-2">
          <div className="relative h-2 rounded-full bg-primary/15">
            {/* center tick */}
            <span className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-hairline" />
            {/* marker */}
            <span
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow-sm"
              style={{ left: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="atlas-label">{poles.low}</span>
            <span className="atlas-label">{poles.high}</span>
          </div>
        </div>
      ) : (
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-primary/15">
          <div
            className={cn('h-full rounded-full bg-primary transition-all')}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {description && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      <p className="atlas-label mt-1.5">confidence · {confPct}%</p>
    </div>
  );
}
