import { useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { AtlasLayout } from '@/components/shell/AtlasLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Onboarding } from '@/components/identity/Onboarding';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useVault } from '@/hooks/useVault';
import { useI18n } from '@/hooks/useI18n';

export default function Begin() {
  const { t } = useI18n();
  const { user } = useCurrentUser();
  const { identity } = useVault();
  const navigate = useNavigate();

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
          <Card className="mx-auto max-w-xl border-dashed bg-card/40">
            <CardContent className="space-y-4 px-8 py-12 text-center">
              <p className="text-muted-foreground">
                {identity?.origin === 'anonymous' && !identity.backed_up
                  ? 'Your identity is ready, but you have not backed up your key yet. Finish that in Settings before you pay or sync.'
                  : 'Your identity is ready. The demo assessment arrives in the next phase.'}
              </p>
              <div className="flex justify-center gap-3">
                <Button onClick={() => navigate('/graph')}>Go to my SoulGraph</Button>
                <Button variant="outline" onClick={() => navigate('/settings')}>
                  Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Onboarding onDone={() => { /* stay; user now logged in */ }} />
        )}
      </div>
    </AtlasLayout>
  );
}
