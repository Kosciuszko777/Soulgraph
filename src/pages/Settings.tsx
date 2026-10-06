import { useEffect, useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import {
  ShieldAlert,
  RefreshCw,
  CloudOff,
  Cloud,
  KeyRound,
  Lock,
  Loader2,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { AtlasLayout } from '@/components/shell/AtlasLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { LoginArea } from '@/components/auth/LoginArea';
import { ThemeToggle } from '@/components/shell/ThemeToggle';
import { LanguageToggle } from '@/components/shell/LanguageToggle';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useVault } from '@/hooks/useVault';
import { useVaultSync } from '@/hooks/useVaultSync';
import { usePanicDelete } from '@/hooks/usePanicDelete';
import { useI18n } from '@/hooks/useI18n';
import { toast } from '@/hooks/useToast';
import { nip19 } from 'nostr-tools';
import { cn } from '@/lib/utils';

function SectionCard({
  icon,
  title,
  description,
  children,
  danger = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <Card className={cn('bg-card/60', danger && 'border-destructive/40')}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-hairline bg-background',
              danger && 'border-destructive/40 text-destructive',
            )}
          >
            {icon}
          </div>
          <div>
            <h2 className="font-display text-xl">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
    </Card>
  );
}

export default function Settings() {
  const { t } = useI18n();
  const { user } = useCurrentUser();
  const { identity } = useVault();

  useSeoMeta({
    title: `${t('page.settings.title')} · ${t('app.name')}`,
    description: t('page.settings.body'),
  });

  const npub = user ? nip19.npubEncode(user.pubkey) : '';

  return (
    <AtlasLayout>
      <div className="atlas-grid-bg border-b border-hairline">
        <div className="container px-4 py-14 sm:px-6 sm:py-20">
          <p className="atlas-label mb-4">{t('nav.settings')}</p>
          <h1 className="font-display text-4xl leading-[1.1] sm:text-5xl">{t('page.settings.title')}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {t('page.settings.body')}
          </p>
        </div>
      </div>

      <div className="container max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="space-y-6">
          {/* Identity */}
          <SectionCard
            icon={<KeyRound className="h-5 w-5 text-primary" />}
            title="Identity"
            description={
              user
                ? identity?.origin === 'anonymous'
                  ? 'An anonymous SoulGraph created in this browser.'
                  : 'Signed in with Nostr. Your signer holds your key.'
                : 'No identity yet. Create one to begin.'
            }
          >
            {user ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="atlas-label">Public key</Label>
                  <Input readOnly value={npub} className="font-mono text-sm" />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <LoginArea className="max-w-60" />
                </div>
              </div>
            ) : (
              <LoginArea className="max-w-60" />
            )}
          </SectionCard>

          {/* Appearance & language */}
          <SectionCard
            icon={<RefreshCw className="h-5 w-5 text-cyan" />}
            title="Appearance & language"
            description="Switch between Night Atlas and Parchment Atlas, and choose your language."
          >
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </SectionCard>

          {/* Upgrade an anonymous identity */}
          {identity?.origin === 'anonymous' && (
            <SectionCard
              icon={<ExternalLink className="h-5 w-5 text-cyan" />}
              title="Upgrade to a signer"
              description="Move your anonymous key into a Nostr signer extension for stronger protection."
            >
              <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
                <li>Back up your key below if you haven&rsquo;t already.</li>
                <li>Install a Nostr signer extension (e.g. a NIP-07 browser extension).</li>
                <li>Import your nsec into the extension.</li>
                <li>Sign out here, then choose &ldquo;Sign in with Nostr&rdquo; and approve with the extension.</li>
              </ol>
            </SectionCard>
          )}

          <SyncSection />
          <PassphraseNote isAnonymous={identity?.origin === 'anonymous'} />

          <Separator className="my-2" />

          <PanicDeleteSection />
        </div>
      </div>
    </AtlasLayout>
  );
}

/* --------------------------------- sync ----------------------------------- */

function SyncSection() {
  const { enabled, relays, setEnabled, setRelays, pushAll, restore } = useVaultSync();
  const { user } = useCurrentUser();
  const [relayInput, setRelayInput] = useState(relays.join('\n'));
  const [busy, setBusy] = useState<'push' | 'restore' | null>(null);

  useEffect(() => {
    setRelayInput(relays.join('\n'));
  }, [relays]);

  const saveRelays = () => {
    const parsed = relayInput
      .split(/\s+/)
      .map((r) => r.trim())
      .filter((r) => r.startsWith('wss://') || r.startsWith('ws://'));
    setRelays(parsed);
    toast({ title: 'Sync relays saved', description: `${parsed.length} relay(s).` });
  };

  const doPush = async () => {
    setBusy('push');
    try {
      await pushAll();
      toast({ title: 'Encrypted envelopes published' });
    } catch (err) {
      toast({ title: 'Publish failed', description: String(err), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const doRestore = async () => {
    setBusy('restore');
    try {
      const n = await restore();
      toast({ title: 'Restore complete', description: `${n} envelope(s) recovered.` });
    } catch (err) {
      toast({ title: 'Restore failed', description: String(err), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <SectionCard
      icon={enabled ? <Cloud className="h-5 w-5 text-cyan" /> : <CloudOff className="h-5 w-5 text-muted-foreground" />}
      title="Sync across devices"
      description="Off by default. When on, SoulGraph publishes only encrypted envelopes to the relays you choose, with opaque identifiers. Relays can still see that this pubkey stores something, and when — but never what."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-hairline p-3">
          <div>
            <p className="font-medium">Enable sync</p>
            <p className="text-sm text-muted-foreground">Publishes encrypted envelopes to your chosen relays.</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} disabled={!user} aria-label="Enable sync" />
        </div>

        {enabled && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="sync-relays" className="atlas-label">
                Sync relays (one per line — a private or paid relay is recommended)
              </Label>
              <textarea
                id="sync-relays"
                value={relayInput}
                onChange={(e) => setRelayInput(e.target.value)}
                rows={3}
                placeholder="wss://your-private-relay.example"
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={saveRelays}>Save relays</Button>
              <Button variant="secondary" size="sm" onClick={doPush} disabled={busy !== null || relays.length === 0}>
                {busy === 'push' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Cloud className="mr-2 h-4 w-4" />}
                Publish now
              </Button>
              <Button variant="ghost" size="sm" onClick={doRestore} disabled={busy !== null || relays.length === 0}>
                {busy === 'restore' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Restore from relays
              </Button>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

/* ------------------------------- passphrase -------------------------------- */

function PassphraseNote({ isAnonymous }: { isAnonymous: boolean }) {
  return (
    <SectionCard
      icon={<Lock className="h-5 w-5 text-primary" />}
      title="Passphrase lock"
      description={
        isAnonymous
          ? 'Optionally protect your local key with a passphrase (stored as NIP-49 ncryptsec, unlocked each session). Set this up during key backup.'
          : 'Your signer manages key protection. A SoulGraph passphrase lock applies only to anonymous, locally-held keys.'
      }
    />
  );
}

/* ------------------------------ panic delete ------------------------------- */

function PanicDeleteSection() {
  const panicDelete = usePanicDelete();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const CONFIRM = 'DELETE EVERYTHING';

  const run = async () => {
    if (confirmText !== CONFIRM) return;
    setBusy(true);
    try {
      await panicDelete();
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <SectionCard
        icon={<ShieldAlert className="h-5 w-5" />}
        title="Everything on this device is gone"
        description="Your local SoulGraph, keys and settings were wiped from this browser."
        danger
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          If you ever enabled sync, we sent deletion requests to your relays. Be honest with
          yourself about this: relays may still retain encrypted copies they cannot read, and we
          cannot force them to forget. The data is unreadable without your key — which is now gone.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      icon={<Trash2 className="h-5 w-5" />}
      title="Delete everything"
      description="Permanently wipe your SoulGraph, keys and settings from this device. This cannot be undone."
      danger
    >
      {!open ? (
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Delete everything
        </Button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Type <span className="atlas-data font-medium text-destructive">{CONFIRM}</span> to confirm.
            If sync was ever enabled, deletion requests will be published to your relays first.
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM}
            aria-label="Type to confirm deletion"
          />
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={run}
              disabled={confirmText !== CONFIRM || busy}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Confirm delete
            </Button>
            <Button variant="ghost" onClick={() => { setOpen(false); setConfirmText(''); }} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
