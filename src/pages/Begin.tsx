import { useSeoMeta } from '@unhead/react';
import { AtlasLayout } from '@/components/shell/AtlasLayout';
import { Onboarding } from '@/components/identity/Onboarding';
import { AssessmentRunner } from '@/components/assessment/AssessmentRunner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useI18n } from '@/hooks/useI18n';

export default function Begin() {
  const { t } = useI18n();
  const { user } = useCurrentUser();

  useSeoMeta({
    title: `${t('page.begin.title')} · ${t('app.name')}`,
    description: t('page.begin.body'),
  });

  return (
    <AtlasLayout>
      <div className="atlas-grid-bg border-b border-hairline">
        <div className="container px-4 py-14 sm:px-6 sm:py-20">
          <p className="atlas-label mb-4">{t('nav.begin')}</p>
          <h1 className="font-display text-4xl leading-[1.1] sm:text-5xl">{t('page.begin.title')}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {t('page.begin.body')}
          </p>
        </div>
      </div>

      <div className="container px-4 py-12 sm:px-6 sm:py-16">
        {user ? (
          <AssessmentRunner mode="demo" />
        ) : (
          <Onboarding onDone={() => { /* stay; user now logged in */ }} />
        )}
      </div>
    </AtlasLayout>
  );
}
