import { Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { Lock } from 'lucide-react';
import { AtlasLayout } from '@/components/shell/AtlasLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AssessmentRunner } from '@/components/assessment/AssessmentRunner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useI18n } from '@/hooks/useI18n';

/**
 * The Complete SoulGraph — the full assessment across all instruments.
 *
 * Ungated during development (Prompt 5 gates it behind a verifiable
 * entitlement via useEntitlement). Continues each instrument where the demo
 * left off; pause and resume are handled by the runner + vault.
 */
export default function Assess() {
  const { t } = useI18n();
  const { user } = useCurrentUser();
  const { complete: entitled, gated } = useEntitlement();

  useSeoMeta({
    title: `${t('page.assess.title')} · ${t('app.name')}`,
    description: t('page.assess.body'),
  });

  return (
    <AtlasLayout>
      <div className="atlas-grid-bg border-b border-hairline">
        <div className="container px-4 py-14 sm:px-6 sm:py-20">
          <p className="atlas-label mb-4">{t('page.assess.kicker')}</p>
          <h1 className="font-display text-4xl leading-[1.1] sm:text-5xl">
            {t('page.assess.title')}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {t('page.assess.body')}
          </p>
        </div>
      </div>

      <div className="container px-4 py-12 sm:px-6 sm:py-16">
        {!user ? (
          <Gate icon body={t('assess.signin.body')} cta={t('nav.begin')} to="/begin" />
        ) : gated && !entitled ? (
          <Gate body={t('assess.locked.body')} cta={t('assess.locked.cta')} to="/unlock" />
        ) : (
          <AssessmentRunner mode="full" />
        )}
      </div>
    </AtlasLayout>
  );
}

function Gate({
  body,
  cta,
  to,
  icon,
}: {
  body: string;
  cta: string;
  to: string;
  icon?: boolean;
}) {
  return (
    <Card className="mx-auto max-w-xl border-dashed bg-card/40">
      <CardContent className="space-y-5 px-8 py-12 text-center">
        {icon && (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-hairline bg-background">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <p className="text-muted-foreground">{body}</p>
        <Button asChild size="lg">
          <Link to={to}>{cta}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
