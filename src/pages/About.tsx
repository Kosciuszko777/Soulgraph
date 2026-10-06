import { useSeoMeta } from '@unhead/react';
import { AtlasLayout } from '@/components/shell/AtlasLayout';
import { useI18n } from '@/hooks/useI18n';

const PHASES = [
  ['I', 'Identity & Assessment'],
  ['II', 'Personal Intelligence'],
  ['III', 'Relationship Intelligence'],
  ['IV', 'Professional Intelligence'],
  ['V', 'Human Marketplace'],
  ['VI', 'Organizational Intelligence'],
  ['VII', 'Referral Economy'],
  ['VIII', 'SoulGraph Network'],
] as const;

export default function About() {
  const { t } = useI18n();

  useSeoMeta({
    title: `${t('nav.about')} · ${t('app.name')}`,
    description: t('app.tagline'),
  });

  return (
    <AtlasLayout>
      <div className="atlas-grid-bg border-b border-hairline">
        <div className="container px-4 py-14 sm:px-6 sm:py-20">
          <p className="atlas-label mb-4">{t('app.tagline')}</p>
          <h1 className="font-display text-4xl leading-[1.1] sm:text-5xl">{t('nav.about')}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {t('landing.law')}
          </p>
        </div>
      </div>

      <div className="container px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-2xl space-y-5 text-lg leading-relaxed text-muted-foreground">
          <p>
            SoulGraph builds a portable, structured, user-owned map of an
            individual — and over time uses that map to improve self-understanding,
            decisions, relationships, coaching, teams and organizations.
          </p>
          <p className="text-foreground">
            The individual owns the SoulGraph. Relationships create the network. AI
            creates intelligence. Professionals create human value. Organizations
            create scale. Referrals create distribution.
          </p>
        </div>

        <h2 className="mt-14 font-display text-2xl">The progression</h2>
        <div className="atlas-rule my-5 max-w-24" />
        <ol className="grid gap-3 sm:grid-cols-2">
          {PHASES.map(([num, name]) => (
            <li
              key={num}
              className="flex items-baseline gap-4 rounded-lg border border-hairline bg-card/40 px-4 py-3"
            >
              <span className="atlas-data w-10 shrink-0 text-primary">{num}</span>
              <span className="text-foreground">{name}</span>
            </li>
          ))}
        </ol>
      </div>
    </AtlasLayout>
  );
}
