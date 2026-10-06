import { Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { Cloud, CloudOff, HardDrive, ShieldCheck, Trash2 } from 'lucide-react';
import { AtlasLayout } from '@/components/shell/AtlasLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useVaultSync } from '@/hooks/useVaultSync';
import { useVault } from '@/hooks/useVault';
import { useI18n } from '@/hooks/useI18n';

export default function PrivacyCenter() {
  const { t } = useI18n();
  const { enabled, relays } = useVaultSync();
  const { identity } = useVault();

  useSeoMeta({
    title: `${t('page.privacy_center.title')} · ${t('app.name')}`,
    description: t('page.privacy_center.body'),
  });

  return (
    <AtlasLayout>
      <div className="atlas-grid-bg border-b border-hairline">
        <div className="container px-4 py-14 sm:px-6 sm:py-20">
          <p className="atlas-label mb-4">{t('nav.privacy')}</p>
          <h1 className="font-display text-4xl leading-[1.1] sm:text-5xl">
            {t('page.privacy_center.title')}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {t('page.privacy_center.body')}
          </p>
        </div>
      </div>

      <div className="container max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-5 sm:grid-cols-2">
          <Card className="bg-card/60">
            <CardHeader>
              <div className="flex items-center gap-3">
                <HardDrive className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg">Where your data lives</h2>
              </div>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              Everything is stored locally in this browser and encrypted per facet.
              {identity ? ' Your identity exists on this device.' : ' No identity exists yet.'}
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardHeader>
              <div className="flex items-center gap-3">
                {enabled ? <Cloud className="h-5 w-5 text-cyan" /> : <CloudOff className="h-5 w-5 text-muted-foreground" />}
                <h2 className="font-display text-lg">Sync</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                {enabled
                  ? `On — publishing encrypted envelopes to ${relays.length} relay(s).`
                  : 'Off. Nothing leaves this device.'}
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/settings">Manage in Settings</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-5 bg-card/60">
          <CardHeader>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg">On revocation, honestly</h2>
            </div>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            When you revoke access, SoulGraph stops sharing future versions, rotates the
            affected facet keys, re-wraps for anyone still permitted, and publishes deletion
            requests. But Nostr cannot make someone forget what they already decrypted, and
            relays may keep encrypted copies they cannot read. We will never pretend otherwise.
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-end">
          <Button asChild variant="ghost" className="gap-2 text-destructive hover:text-destructive">
            <Link to="/settings">
              <Trash2 className="h-4 w-4" /> Delete everything
            </Link>
          </Button>
        </div>
      </div>
    </AtlasLayout>
  );
}
