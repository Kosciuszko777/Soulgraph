import type { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { useAttribution } from '@/hooks/useAttribution';

/** The standard SoulGraph page frame: header, content, footer. */
export function AtlasLayout({ children }: { children: ReactNode }) {
  // Capture first-touch referral attribution on any entry point.
  useAttribution();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
