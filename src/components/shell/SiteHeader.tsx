import { Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { SoulGraphMark } from '@/components/brand/SoulGraphMark';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { LoginArea } from '@/components/auth/LoginArea';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/graph', key: 'nav.graph' },
  { to: '/privacy-center', key: 'nav.privacy' },
  { to: '/about/method', key: 'nav.method' },
  { to: '/settings', key: 'nav.settings' },
] as const;

export function SiteHeader() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          to="/"
          className="group flex items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('app.name')}
        >
          <SoulGraphMark className="h-7 w-7 text-foreground transition-colors group-hover:text-primary" />
          <span className="font-display text-xl tracking-tight">{t('app.name')}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground',
                  isActive && 'text-foreground',
                )
              }
            >
              {t(item.key)}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-1 md:flex">
          <LanguageToggle />
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="ml-1">
            <Link to="/unlock">{t('nav.unlock')}</Link>
          </Button>
          <LoginArea className="ml-1 max-w-56" />
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-hairline bg-background md:hidden">
          <nav className="container flex flex-col gap-1 px-4 py-4" aria-label="Mobile">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2.5 text-base text-muted-foreground transition-colors hover:text-foreground',
                    isActive && 'text-foreground',
                  )
                }
              >
                {t(item.key)}
              </NavLink>
            ))}
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-hairline pt-4">
              <LanguageToggle />
              <Button asChild variant="outline" size="sm" onClick={() => setOpen(false)}>
                <Link to="/unlock">{t('nav.unlock')}</Link>
              </Button>
            </div>
            <div className="mt-2">
              <LoginArea className="w-full" />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
