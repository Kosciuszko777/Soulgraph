/**
 * AssessmentRunner — the Assess step of the core loop.
 *
 * Presents demo (or full) items one at a time, grouped implicitly by
 * instrument, with honest evidence labels and instrument notes. On completion
 * it scores on-device (deterministic engine), seals each facet, and persists an
 * immutable version — then hands off to the SoulGraph view.
 *
 * Nothing is sent anywhere. All computation is local. See docs/ARCHITECTURE.md.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { EvidenceBadge } from '@/components/assessment/EvidenceBadge';
import { LikertScale } from '@/components/assessment/LikertScale';
import { useAssessment, type AssessmentMode } from '@/hooks/useAssessment';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';

export function AssessmentRunner({
  mode,
  onComplete,
}: {
  mode: AssessmentMode;
  onComplete?: (versionId: string) => void;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const {
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
  } = useAssessment(mode);

  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);

  const current = items[index];
  const atLast = index >= total - 1;
  const progress = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

  // Instrument changes mark a new "chapter" — show its note once per chapter.
  const isFirstOfInstrument = useMemo(() => {
    if (!current) return false;
    const prev = items[index - 1];
    return !prev || prev.instrument.id !== current.instrument.id;
  }, [current, items, index]);

  if (!current && !done) return null;

  async function handleFinish() {
    const versionId = await finish();
    if (versionId) {
      setDone(true);
      onComplete?.(versionId);
    }
  }

  // ---- Completed state -----------------------------------------------------
  if (done) {
    return (
      <Card className="mx-auto max-w-xl border-hairline bg-card/60">
        <CardContent className="space-y-6 px-8 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-hairline bg-background">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-2xl">{t('assessment.done.title')}</h2>
            <p className="leading-relaxed text-muted-foreground">
              {t('assessment.done.body')}
            </p>
          </div>
          <Button size="lg" onClick={() => navigate('/graph')}>
            {t('assessment.done.cta')}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  const selected = answers[current.item.id];

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress header */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <span className="atlas-label">
            {t('assessment.progress.item')} {index + 1} / {total}
          </span>
          <span className="atlas-data text-sm text-muted-foreground">{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Instrument chapter intro */}
      {isFirstOfInstrument && (
        <div className="mb-6 motion-safe:animate-atlas-fade">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-xl">{t(current.instrument.name_key)}</h2>
            <EvidenceBadge evidence={current.instrument.evidence} />
          </div>
          {current.instrument.note_key && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t(current.instrument.note_key)}
            </p>
          )}
        </div>
      )}

      {/* The item */}
      <Card className="border-hairline bg-card/60">
        <CardContent className="px-6 py-10 sm:px-10">
          <p
            key={current.item.id}
            className="text-center font-display text-2xl leading-snug motion-safe:animate-atlas-fade sm:text-3xl"
          >
            {t(current.item.prompt_key)}
          </p>

          <LikertScale
            name={current.item.id}
            value={selected}
            onChange={(value) => {
              answer(current.item.id, value);
              // Auto-advance after a beat, unless we're on the last item.
              if (!atLast) {
                window.setTimeout(() => setIndex((i) => Math.min(i + 1, total - 1)), 180);
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          onClick={() => setIndex((i) => Math.max(i - 1, 0))}
          disabled={index === 0 || saving}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('assessment.nav.back')}
        </Button>

        {atLast ? (
          <Button onClick={handleFinish} disabled={!complete || saving || !canPersist}>
            {saving ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                {t('assessment.nav.scoring')}
              </>
            ) : (
              <>
                {t('assessment.nav.finish')}
                <Sparkles className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => setIndex((i) => Math.min(i + 1, total - 1))}
            disabled={saving}
          >
            {t('assessment.nav.next')}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Honest footnotes */}
      <div className="mt-6 space-y-2">
        <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          {t('assessment.footer.local')}
        </p>
        {!canPersist && (
          <p className={cn('text-center text-xs text-destructive')}>
            {t('assessment.footer.no_encrypt')}
          </p>
        )}
        {error && <p className="text-center text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
