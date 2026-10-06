/**
 * LikertScale — a 5-point agreement selector for a single item.
 *
 * Fully keyboard-accessible (radiogroup + arrow keys via native radios), with a
 * visible focus ring and clear selected state. The poles are labelled so the
 * direction is never ambiguous.
 */

import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/useI18n';

const POINTS = [1, 2, 3, 4, 5] as const;

export function LikertScale({
  name,
  value,
  onChange,
}: {
  name: string;
  value: number | undefined;
  onChange: (value: number) => void;
}) {
  const { t } = useI18n();

  return (
    <div
      role="radiogroup"
      aria-label={t('assessment.likert.aria')}
      className="mt-6"
    >
      <div className="flex items-center justify-between gap-4">
        {POINTS.map((point) => {
          const selected = value === point;
          // Size scales from the poles toward the neutral midpoint.
          const size =
            point === 3 ? 'h-7 w-7' : point === 1 || point === 5 ? 'h-11 w-11' : 'h-9 w-9';
          return (
            <label
              key={point}
              className="flex cursor-pointer flex-col items-center gap-2"
            >
              <input
                type="radio"
                name={name}
                value={point}
                checked={selected}
                onChange={() => onChange(point)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  'flex items-center justify-center rounded-full border-2 transition-all',
                  'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
                  size,
                  selected
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-hairline bg-background text-transparent hover:border-primary/60',
                )}
                aria-hidden="true"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              </span>
            </label>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="atlas-label">{t('assessment.likert.disagree')}</span>
        <span className="atlas-label">{t('assessment.likert.agree')}</span>
      </div>
    </div>
  );
}
