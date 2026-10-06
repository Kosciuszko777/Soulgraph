import { Link } from 'react-router-dom';
import { SoulGraphMark } from '@/components/brand/SoulGraphMark';
import { useI18n } from '@/hooks/useI18n';

export function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="mt-24 border-t border-hairline">
      <div className="container px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <SoulGraphMark className="h-6 w-6 text-foreground" />
              <span className="font-display text-lg">{t('app.name')}</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t('landing.law')}
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm" aria-label="Footer">
            <Link to="/about/method" className="text-muted-foreground hover:text-foreground">
              {t('nav.method')}
            </Link>
            <Link to="/privacy-center" className="text-muted-foreground hover:text-foreground">
              {t('nav.privacy')}
            </Link>
            <Link to="/legal/privacy" className="text-muted-foreground hover:text-foreground">
              {t('page.legal.privacy.title')}
            </Link>
            <Link to="/legal/terms" className="text-muted-foreground hover:text-foreground">
              {t('page.legal.terms.title')}
            </Link>
            <Link to="/about" className="text-muted-foreground hover:text-foreground">
              {t('nav.about')}
            </Link>
            <Link to="/settings" className="text-muted-foreground hover:text-foreground">
              {t('nav.settings')}
            </Link>
          </nav>
        </div>

        <div className="atlas-rule my-8" />

        <div className="flex flex-col items-start justify-between gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p className="max-w-xl leading-relaxed">{t('landing.evidence.note')}</p>
          <a
            href="https://shakespeare.diy"
            target="_blank"
            rel="noreferrer"
            className="whitespace-nowrap underline-offset-4 hover:text-foreground hover:underline"
          >
            {t('footer.vibed')}
          </a>
        </div>
      </div>
    </footer>
  );
}
