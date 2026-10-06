import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConstellationFigure, NIGHT_THEME } from '@/components/graph/Constellation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useVault } from '@/hooks/useVault';
import { useInterpretation } from '@/hooks/useInterpretation';
import { useVersionMeta } from '@/hooks/useVersionMeta';
import { useI18n } from '@/hooks/useI18n';
import { summarizeGraph } from '@/lib/graphSummary';
import { scaleLabelKeys } from '@/core/engine/instruments';

export default function GraphOnePager() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { state, currentGraph, unlock } = useVault();
  const interpretation = useInterpretation(currentGraph);
  const meta = useVersionMeta();
  const [name, setName] = useState('');

  useSeoMeta({
    title: `${t('page.onepager.title')} · ${t('app.name')}`,
    description: t('page.onepager.body'),
  });

  useEffect(() => {
    if (user && state === 'locked') void unlock();
  }, [user, state, unlock]);

  // Tag <body> while this route is mounted so print CSS can hide app chrome.
  useEffect(() => {
    document.body.classList.add('printing-onepager');
    return () => document.body.classList.remove('printing-onepager');
  }, []);

  if (!currentGraph) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <p className="text-muted-foreground">{t('graph.empty.body')}</p>
        <Button asChild>
          <Link to="/begin">{t('graph.empty.cta')}</Link>
        </Button>
      </div>
    );
  }

  const summary = summarizeGraph(currentGraph);
  const date = new Date(currentGraph.created_at * 1000).toLocaleDateString(
    locale === 'de' ? 'de-CH' : 'en-GB',
    { year: 'numeric', month: 'long', day: 'numeric' },
  );
  const highlights = interpretation?.highlights ?? [];

  return (
    <div className="onepager-screen">
      {/* Controls (hidden in print via app-chrome class) */}
      <div className="app-chrome mx-auto mb-6 flex max-w-[210mm] items-center justify-between gap-4 px-2">
        <Button variant="ghost" onClick={() => navigate('/graph')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('onepager.back')}
        </Button>
        <div className="flex items-center gap-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 40))}
            placeholder={t('onepager.name_placeholder')}
            className="w-44"
            aria-label={t('onepager.name_placeholder')}
          />
          <Button onClick={() => window.print()}>
            <Download className="mr-1 h-4 w-4" />
            {t('onepager.download')}
          </Button>
        </div>
      </div>

      {/* The A4 plate */}
      <article className="onepager-page">
        <div className="flex h-full flex-col px-[16mm] py-[14mm]">
          {/* Header */}
          <header className="flex items-start justify-between border-b border-white/15 pb-[6mm]">
            <div>
              <p className="font-mono text-[9pt] uppercase tracking-[0.25em] text-[#c69749]">
                {t('app.name')}
              </p>
              <h1 className="mt-1 font-serif text-[26pt] leading-none text-white">
                {name || t('onepager.untitled')}
              </h1>
            </div>
            <div className="text-right font-mono text-[8.5pt] text-white/60">
              <p>{date}</p>
              {meta && (
                <p>
                  {t('onepager.version')} {meta.number}
                </p>
              )}
            </div>
          </header>

          {/* Body: constellation + facets */}
          <div className="grid flex-1 grid-cols-[1fr_1fr] gap-[10mm] py-[8mm]">
            {/* Left: constellation */}
            <div className="flex flex-col">
              <div className="aspect-square w-full overflow-hidden rounded-lg border border-white/10">
                <ConstellationFigure graph={currentGraph} theme={NIGHT_THEME} />
              </div>
              {summary.jungCode && (
                <p className="mt-[4mm] text-center font-mono text-[16pt] tracking-[0.35em] text-[#c69749]">
                  {summary.jungCode}
                </p>
              )}
            </div>

            {/* Right: compact facet readouts */}
            <div className="flex flex-col gap-[5mm] text-[9.5pt] leading-snug">
              <PlateSection title={t('instrument.jung.name')} label="Interpretive">
                {summary.jungAxes.map((axis) => {
                  const { label_key } = scaleLabelKeys('jung', axis.id);
                  return (
                    <PlateBar
                      key={axis.id}
                      label={label_key ? t(label_key) : axis.id}
                      value={axis.value}
                    />
                  );
                })}
              </PlateSection>

              <PlateSection title={t('instrument.enneagram.name')} label="Interpretive">
                {summary.enneagramInconclusive || !summary.enneagramDominant ? (
                  <p className="text-white/55">{t('onepager.enneagram_unclear')}</p>
                ) : (
                  <p className="text-white/85">
                    <span className="font-mono text-[13pt] text-[#c69749]">
                      {summary.enneagramDominant}
                      {summary.enneagramWing ? `w${summary.enneagramWing}` : ''}
                    </span>{' '}
                    {t(scaleLabelKeys('enneagram', String(summary.enneagramDominant)).label_key ?? '')}
                  </p>
                )}
              </PlateSection>

              <PlateSection title={t('instrument.life_pattern.name')} label="Experimental">
                {summary.lifeTop.map((theme) => {
                  const { label_key } = scaleLabelKeys('life_pattern', theme.id);
                  return (
                    <PlateBar
                      key={theme.id}
                      label={label_key ? t(label_key) : theme.id}
                      value={theme.value}
                    />
                  );
                })}
              </PlateSection>

              {summary.coreTop.length > 0 && (
                <PlateSection title={t('graph.core.title')} label="Experimental">
                  {summary.coreTop.map((dim) => (
                    <PlateBar key={dim.id} label={t(`core.dim.${dim.id}`)} value={dim.value} />
                  ))}
                </PlateSection>
              )}
            </div>
          </div>

          {/* Insights */}
          {highlights.length > 0 && (
            <div className="border-t border-white/15 py-[6mm]">
              <p className="mb-[3mm] font-mono text-[8pt] uppercase tracking-[0.25em] text-white/50">
                {t('onepager.insights')}
              </p>
              <div className="grid grid-cols-2 gap-x-[8mm] gap-y-[2mm] text-[9pt] leading-snug text-white/80">
                {highlights.slice(0, 4).map((h, i) => (
                  <p key={i} className="flex gap-2">
                    <span className="text-[#c69749]">★</span>
                    {t(h.key)}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Footer: evidence legend + caveat + referral slot */}
          <footer className="mt-auto border-t border-white/15 pt-[5mm] text-[7.5pt] leading-relaxed text-white/55">
            <div className="flex flex-wrap gap-x-[6mm] gap-y-[1mm] font-mono uppercase tracking-[0.15em]">
              <span>
                <span style={{ color: '#6faec0' }}>●</span> {t('evidence.psychometric')}
              </span>
              <span>
                <span style={{ color: '#c69749' }}>●</span> {t('evidence.interpretive')}
              </span>
              <span>
                <span style={{ color: '#9b7bc4' }}>●</span> {t('evidence.experimental')}
              </span>
            </div>
            <p className="mt-[2mm]">{t('onepager.caveat')}</p>
            {/* Referral link slot — populated in Prompt 5. */}
            <p className="mt-[1mm] font-mono text-white/40">{t('onepager.referral_slot')}</p>
          </footer>
        </div>
      </article>
    </div>
  );
}

function PlateSection({
  title,
  label,
  children,
}: {
  title: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-[2mm] flex items-baseline justify-between">
        <h2 className="font-serif text-[12pt] text-white">{title}</h2>
        <span className="font-mono text-[6.5pt] uppercase tracking-[0.2em] text-white/40">
          {label}
        </span>
      </div>
      <div className="space-y-[1.5mm]">{children}</div>
    </section>
  );
}

function PlateBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-[3mm]">
      <span className="w-[26mm] flex-shrink-0 truncate text-white/75">{label}</span>
      <span className="relative h-[2mm] flex-1 overflow-hidden rounded-full bg-white/12">
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, background: '#c69749' }}
        />
      </span>
      <span className="w-[8mm] text-right font-mono text-[8pt] text-white/60">
        {Math.round(pct)}
      </span>
    </div>
  );
}
