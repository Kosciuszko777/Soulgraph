import { useSeoMeta } from '@unhead/react';
import { AtlasLayout } from '@/components/shell/AtlasLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/hooks/useI18n';
import { CATALOG, formatPrice } from '@/config/catalog';

const STAGE_LABEL: Record<string, string> = {
  person: 'Person',
  pair: 'Pair',
  team: 'Team',
  organization: 'Organization',
};

export default function Unlock() {
  const { t } = useI18n();

  useSeoMeta({
    title: `${t('page.unlock.title')} · ${t('app.name')}`,
    description: t('page.unlock.body'),
  });

  return (
    <AtlasLayout>
      <div className="atlas-grid-bg border-b border-hairline">
        <div className="container px-4 py-14 sm:px-6 sm:py-20">
          <p className="atlas-label mb-4">{t('nav.unlock')}</p>
          <h1 className="font-display text-4xl leading-[1.1] sm:text-5xl">{t('page.unlock.title')}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {t('page.unlock.body')}
          </p>
        </div>
      </div>

      <div className="container px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CATALOG.map((product) => (
            <Card key={product.id} className="flex flex-col bg-card/60">
              <CardHeader className="gap-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl">{product.name}</h2>
                  <Badge variant="outline" className="atlas-label border-hairline px-2 py-0.5">
                    {STAGE_LABEL[product.stage]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{product.tagline}</p>
              </CardHeader>
              <CardContent className="mt-auto">
                <div className="atlas-rule mb-4" />
                {product.prices.length === 0 ? (
                  <p className="atlas-data text-2xl text-primary">Free</p>
                ) : (
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    {product.prices.map((price, i) => (
                      <span
                        key={i}
                        className="atlas-data text-2xl text-foreground first:text-primary"
                      >
                        {formatPrice(price)}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-10 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t('landing.evidence.note')}
        </p>
      </div>
    </AtlasLayout>
  );
}
