import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { ArrowRight, Loader2, Lock } from 'lucide-react';
import { AtlasLayout } from '@/components/shell/AtlasLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GraphFacets } from '@/components/graph/GraphFacets';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useVault } from '@/hooks/useVault';
import { useI18n } from '@/hooks/useI18n';

export default function Graph() {
  const { t } = useI18n();
  const { user } = useCurrentUser();
  const { state, currentGraph, loading, unlock } = useVault();

  useSeoMeta({
    title: `${t('page.graph.title')} · ${t('app.name')}`,
    description: t('page.graph.body'),
  });

  // Auto-decrypt into memory when we have locked data and a signer is ready.
  useEffect(() => {
    if (user && state === 'locked') {
      void unlock();
    }
  }, [user, state, unlock]);

  const confidencePct = currentGraph
    ? Math.round(currentGraph.confidence.overall * 100)
    : 0;

  return (
    <AtlasLayout>
      <div className="atlas-grid-bg border-b border-hairline">
        <div className="container px-4 py-14 sm:px-6 sm:py-20">
          <p className="atlas-label mb-4">{t('nav.graph')}</p>
          <h1 className="font-display text-4xl leading-[1.1] sm:text-5xl">{t('page.graph.title')}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {t('page.graph.body')}
          </p>
        </div>
      </div>

      <div className="container px-4 py-12 sm:px-6 sm:py-16">
        {!user ? (
          <SignInPrompt />
        ) : loading || state === 'unlocking' ? (
          <GraphSkeleton />
        ) : currentGraph ? (
          <div className="space-y-8">
            {/* Overall confidence + honest framing */}
            <Card className="border-hairline bg-card/60">
              <CardContent className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-hairline bg-background">
                    <span className="atlas-data text-lg text-primary">{confidencePct}%</span>
                  </div>
                  <div>
                    <p className="font-medium">{t('graph.summary.title')}</p>
                    <p className="text-sm text-muted-foreground">{t('graph.summary.scaled')}</p>
                  </div>
                </div>
                <Button variant="outline" asChild>
                  <Link to="/begin">
                    {t('graph.summary.full_cta')}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <GraphFacets graph={currentGraph} />

            <p className="mx-auto max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
              {t('graph.footer.boundaries')}
            </p>
          </div>
        ) : (
          <EmptyGraph />
        )}
      </div>
    </AtlasLayout>
  );
}

function SignInPrompt() {
  const { t } = useI18n();
  return (
    <Card className="mx-auto max-w-xl border-dashed bg-card/40">
      <CardContent className="space-y-5 px-8 py-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-hairline bg-background">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">{t('graph.signin.body')}</p>
        <Button asChild size="lg">
          <Link to="/begin">{t('nav.begin')}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyGraph() {
  const { t } = useI18n();
  return (
    <Card className="mx-auto max-w-xl border-dashed bg-card/40">
      <CardContent className="space-y-5 px-8 py-12 text-center">
        <p className="text-muted-foreground">{t('graph.empty.body')}</p>
        <Button asChild size="lg">
          <Link to="/begin">
            {t('graph.empty.cta')}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function GraphSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="border-hairline bg-card/60">
            <CardContent className="space-y-5 px-6 py-8">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-4/6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Decrypting your SoulGraph…
      </div>
    </div>
  );
}
