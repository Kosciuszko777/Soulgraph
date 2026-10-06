import { useSeoMeta } from '@unhead/react';
import { AtlasLayout } from '@/components/shell/AtlasLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useI18n } from '@/hooks/useI18n';

const EVIDENCE = [
  { key: 'psychometric', label: 'evidence.psychometric', body: 'method.evidence.psychometric.body', accent: 'text-cyan' },
  { key: 'interpretive', label: 'evidence.interpretive', body: 'method.evidence.interpretive.body', accent: 'text-primary' },
  { key: 'experimental', label: 'evidence.experimental', body: 'method.evidence.experimental.body', accent: 'text-chart-5' },
] as const;

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

      <div className="container px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="font-display text-2xl">{t('method.evidence.title')}</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {EVIDENCE.map((e) => (
            <Card key={e.key} className="bg-card/60">
              <CardHeader>
                <p className={`atlas-label ${e.accent}`}>{t(e.label)}</p>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed text-muted-foreground">{t(e.body)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-14 max-w-3xl">
          <h2 className="font-display text-2xl text-foreground">
            {t('method.boundaries.title')}
          </h2>
          <div className="atlas-rule my-5 max-w-24" />
          <p className="text-lg leading-relaxed text-muted-foreground">
            {t('method.boundaries.body')}
          </p>
        </div>
      </div>
    </AtlasLayout>
  );
}
