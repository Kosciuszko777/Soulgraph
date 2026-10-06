import { useSeoMeta } from '@unhead/react';
import { AtlasLayout } from '@/components/shell/AtlasLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckoutPanel } from '@/components/payment/CheckoutPanel';
import { InvitePanel } from '@/components/referral/InvitePanel';
import { useI18n } from '@/hooks/useI18n';
import { usePriceInSats } from '@/hooks/usePriceInSats';
import { CATALOG, formatPrice, getProduct, primaryPrice } from '@/config/catalog';
import { COMPLETE_PRODUCT_ID } from '@/config/flags';

const STAGE_LABEL: Record<string, string> = {
  person: 'Person',
  pair: 'Pair',
  team: 'Team',
  organization: 'Organization',
};

export default function Unlock() {
  const { t } = useI18n();
  const complete = getProduct(COMPLETE_PRODUCT_ID);

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

      {/* Primary: Complete SoulGraph checkout */}
      <div className="container px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
          <div className="space-y-6">
            {complete && <CheckoutPanel product={complete} />}
          </div>
          <InvitePanel />
        </div>
      </div>

      {/* The full pricing ladder (reference; only Phase I products are purchasable). */}
      <div className="border-t border-hairline bg-muted/20">
        <div className="container px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="font-display text-2xl">{t('unlock.ladder.title')}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t('unlock.ladder.note')}</p>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CATALOG.map((product) => (
              <LadderCard key={product.id} product={product} />
            ))}
          </div>

          <p className="mt-10 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t('landing.evidence.note')}
          </p>
        </div>
      </div>
    </AtlasLayout>
  );
}

function LadderCard({ product }: { product: (typeof CATALOG)[number] }) {
  const { t } = useI18n();
  const price = primaryPrice(product);
  const sats = usePriceInSats(price?.amount ?? 0, price?.currency ?? 'EUR');

  return (
    <Card className="flex flex-col bg-card/60">
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl">{product.name}</h3>
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
          <div className="space-y-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {product.prices.map((p, i) => (
                <span key={i} className="atlas-data text-2xl text-foreground first:text-primary">
                  {formatPrice(p)}
                </span>
              ))}
            </div>
            {price && sats.sats !== null && (
              <p className="text-xs text-muted-foreground">≈ {sats.sats.toLocaleString()} sats</p>
            )}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          {product.purchasable ? t('unlock.available_now') : t('unlock.coming_phase')}
        </p>
      </CardContent>
    </Card>
  );
}
