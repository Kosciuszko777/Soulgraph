import type { ReactNode } from 'react';
import { useSeoMeta } from '@unhead/react';
import { AtlasLayout } from './AtlasLayout';
import { useI18n } from '@/hooks/useI18n';

/**
 * A styled placeholder for shell routes that are charted but not yet built.
 * Keeps the Night Atlas aesthetic — eyebrow label, serif title, hairline, and a
 * quiet "in construction" note — so the shell feels finished, not empty.
 */
export function PlaceholderPage({
  titleKey,
  bodyKey,
  eyebrow,
  children,
}: {
  titleKey: string;
  bodyKey: string;
  eyebrow?: string;
  children?: ReactNode;
}) {
  const { t } = useI18n();
  const title = t(titleKey);

  useSeoMeta({
    title: `${title} · ${t('app.name')}`,
    description: t(bodyKey),
  });

  return (
    <AtlasLayout>
      <section className="container px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl">
          <p className="atlas-label mb-4">{eyebrow ?? t('app.tagline')}</p>
          <h1 className="font-display text-4xl leading-[1.1] sm:text-5xl">{title}</h1>
          <div className="atlas-rule my-7 max-w-24" />
          <p className="text-lg leading-relaxed text-muted-foreground">{t(bodyKey)}</p>

          {children}

          <p className="atlas-label mt-10 inline-block rounded-full border border-hairline px-3 py-1.5">
            {t('placeholder.coming')}
          </p>
        </div>
      </section>
    </AtlasLayout>
  );
}
