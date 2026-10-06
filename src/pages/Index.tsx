import { Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { ArrowRight, Lock, FileText, Compass } from 'lucide-react';
import { AtlasLayout } from '@/components/shell/AtlasLayout';
import { SoulGraphMark } from '@/components/brand/SoulGraphMark';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/hooks/useI18n';

function LoopStep({
  index,
  icon,
  title,
  body,
}: {
  index: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="motion-safe:animate-atlas-drift">
      <div className="flex items-center gap-3">
        <span className="atlas-data text-sm text-primary">{index}</span>
        <span className="text-cyan">{icon}</span>
      </div>
      <h3 className="mt-4 font-display text-2xl">{title}</h3>
      <p className="mt-2 leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

const Index = () => {
  const { t } = useI18n();

  useSeoMeta({
    title: `${t('app.name')} — ${t('landing.headline')}`,
    description: t('landing.subline'),
  });

  return (
    <AtlasLayout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-hairline">
        <div className="atlas-grid-bg absolute inset-0" aria-hidden="true" />
        <div className="atlas-starfield absolute inset-0 opacity-70" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          aria-hidden="true"
        />
        <div className="container relative px-4 py-24 sm:px-6 sm:py-32">
          <div className="mx-auto max-w-3xl text-center motion-safe:animate-atlas-fade">
            <div className="mb-8 flex justify-center">
              <SoulGraphMark className="h-12 w-12 text-foreground" />
            </div>
            <p className="atlas-label mb-6">{t('app.tagline')}</p>
            <h1 className="font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
              {t('landing.headline')}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {t('landing.subline')}
            </p>
            <div className="mt-10 flex flex-col items-center gap-3">
              <Button asChild size="lg" className="group h-12 px-8 text-base">
                <Link to="/begin">
                  {t('landing.cta')}
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <p className="atlas-label">{t('landing.cta_note')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* The core loop: Assess → Map → Understand */}
      <section className="container px-4 py-20 sm:px-6 sm:py-28">
        <p className="atlas-label mb-10 text-center">{t('landing.how.title')}</p>
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-3 md:gap-8">
          <LoopStep
            index="01"
            icon={<Compass className="h-5 w-5" />}
            title={t('landing.how.assess.title')}
            body={t('landing.how.assess.body')}
          />
          <LoopStep
            index="02"
            icon={<SoulGraphMark className="h-5 w-5" />}
            title={t('landing.how.map.title')}
            body={t('landing.how.map.body')}
          />
          <LoopStep
            index="03"
            icon={<FileText className="h-5 w-5" />}
            title={t('landing.how.understand.title')}
            body={t('landing.how.understand.body')}
          />
        </div>
      </section>

      {/* Privacy */}
      <section className="border-y border-hairline bg-card/40">
        <div className="container grid gap-10 px-4 py-20 sm:px-6 sm:py-24 md:grid-cols-[auto_1fr] md:gap-16">
          <div className="flex items-start">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-hairline bg-background">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl leading-tight sm:text-4xl">
              {t('landing.privacy.title')}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              {t('landing.privacy.body')}
            </p>
          </div>
        </div>
      </section>

      {/* Quiet evidence note */}
      <section className="container px-4 py-16 sm:px-6">
        <p className="mx-auto max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
          {t('landing.evidence.note')}
        </p>
      </section>
    </AtlasLayout>
  );
};

export default Index;
