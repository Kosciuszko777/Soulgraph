import { useSeoMeta } from '@unhead/react';
import { AtlasLayout } from '@/components/shell/AtlasLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EvidenceBadge } from '@/components/assessment/EvidenceBadge';
import { useI18n } from '@/hooks/useI18n';
import type { EvidenceLabel } from '@/core/graph/schema';

const EVIDENCE: { key: EvidenceLabel; body: string }[] = [
  { key: 'psychometric', body: 'method.evidence.psychometric.body' },
  { key: 'interpretive', body: 'method.evidence.interpretive.body' },
  { key: 'experimental', body: 'method.evidence.experimental.body' },
];

const FRAMEWORKS: { title: string; evidence: EvidenceLabel; what: string; standing: string }[] = [
  {
    title: 'instrument.jung.name',
    evidence: 'interpretive',
    what: 'method.fw.jung.what',
    standing: 'method.fw.jung.standing',
  },
  {
    title: 'instrument.enneagram.name',
    evidence: 'interpretive',
    what: 'method.fw.enneagram.what',
    standing: 'method.fw.enneagram.standing',
  },
  {
    title: 'instrument.life_pattern.name',
    evidence: 'experimental',
    what: 'method.fw.life.what',
    standing: 'method.fw.life.standing',
  },
  {
    title: 'graph.core.title',
    evidence: 'experimental',
    what: 'method.fw.core.what',
    standing: 'method.fw.core.standing',
  },
];

export default function AboutMethod() {
  const { t } = useI18n();

  useSeoMeta({
    title: `${t('page.method.title')} · ${t('app.name')}`,
    description: t('page.method.body'),
  });

  return (
    <AtlasLayout>
      <div className="atlas-grid-bg border-b border-hairline">
        <div className="container px-4 py-14 sm:px-6 sm:py-20">
          <p className="atlas-label mb-4">{t('nav.method')}</p>
          <h1 className="max-w-3xl font-display text-4xl leading-[1.1] sm:text-5xl">
            {t('page.method.title')}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {t('page.method.body')}
          </p>
        </div>
      </div>

      <div className="container space-y-16 px-4 py-12 sm:px-6 sm:py-16">
        {/* Three evidence labels */}
        <section>
          <h2 className="font-display text-2xl">{t('method.evidence.title')}</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">{t('method.evidence.intro')}</p>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {EVIDENCE.map((e) => (
              <Card key={e.key} className="border-hairline bg-card/60">
                <CardHeader>
                  <EvidenceBadge evidence={e.key} />
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-muted-foreground">{t(e.body)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Each framework */}
        <section>
          <h2 className="font-display text-2xl">{t('method.frameworks.title')}</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {FRAMEWORKS.map((f) => (
              <Card key={f.title} className="border-hairline bg-card/60">
                <CardHeader className="gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-display text-xl">{t(f.title)}</h3>
                    <EvidenceBadge evidence={f.evidence} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="leading-relaxed text-muted-foreground">{t(f.what)}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground/80">
                    <span className="atlas-label mr-2 text-foreground/60">
                      {t('results.standing')}
                    </span>
                    {t(f.standing)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Scaled, not normed + confidence */}
        <section className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl">{t('method.scaled.title')}</h2>
            <div className="atlas-rule my-4 max-w-24" />
            <p className="leading-relaxed text-muted-foreground">{t('method.scaled.body')}</p>
          </div>
          <div>
            <h2 className="font-display text-2xl">{t('method.confidence.title')}</h2>
            <div className="atlas-rule my-4 max-w-24" />
            <p className="leading-relaxed text-muted-foreground">{t('method.confidence.body')}</p>
          </div>
        </section>

        {/* What SoulGraph is not */}
        <section className="max-w-3xl">
          <h2 className="font-display text-2xl text-foreground">{t('method.boundaries.title')}</h2>
          <div className="atlas-rule my-5 max-w-24" />
          <p className="text-lg leading-relaxed text-muted-foreground">
            {t('method.boundaries.body')}
          </p>
        </section>
      </div>
    </AtlasLayout>
  );
}
