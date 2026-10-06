import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { QRCodeCanvas } from '@/components/ui/qrcode';
import { KeyBackup } from '@/components/identity/KeyBackup';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useVault } from '@/hooks/useVault';
import { useActiveNsec } from '@/hooks/useActiveNsec';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useCheckout } from '@/hooks/useCheckout';
import { usePriceInSats } from '@/hooks/usePriceInSats';
import { useI18n } from '@/hooks/useI18n';
import { useToast } from '@/hooks/useToast';
import { formatPrice, primaryPrice, type Product } from '@/config/catalog';
import { cn } from '@/lib/utils';

/**
 * The Lightning checkout for a SoulGraph product. Handles, in order:
 *   - the sign-in gate,
 *   - the REQUIRED key-backup gate (before any payment),
 *   - the public-receipt privacy warning for anonymous users,
 *   - live sats pricing with a "rate as of" timestamp,
 *   - the pay action (NWC → WebLN → QR), and
 *   - clear payment states (awaiting / detected / verified / failed) with a
 *     "check again" action and a support path.
 */
export function CheckoutPanel({ product }: { product: Product }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { identity, refresh } = useVault();
  const activeNsec = useActiveNsec();

  const entitlement = useEntitlement(product.id);
  const price = primaryPrice(product);
  const satsPrice = usePriceInSats(price?.amount ?? 0, price?.currency ?? 'EUR');
  const checkout = useCheckout(product, satsPrice.msat);

  const [backupDone, setBackupDone] = useState(false);

  // Once a payment succeeds on a rail, poll for the verified receipt.
  const recheck = entitlement.recheck;
  const paymentPhase = checkout.state.phase;
  useEffect(() => {
    if (paymentPhase === 'paid') {
      const id = setInterval(() => recheck(), 4000);
      return () => clearInterval(id);
    }
  }, [paymentPhase, recheck]);

  if (!user) {
    return (
      <Gate icon={<LockKeyhole className="h-5 w-5 text-muted-foreground" />} body={t('checkout.signin')}>
        <Button asChild size="lg">
          <Link to="/begin">{t('nav.begin')}</Link>
        </Button>
      </Gate>
    );
  }

  // Already entitled → done.
  if (entitlement.entitled) {
    return (
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="flex items-center gap-4 px-6 py-6">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
          <div>
            <p className="font-medium">{t('checkout.unlocked_title')}</p>
            <p className="text-sm text-muted-foreground">{t('checkout.unlocked_body')}</p>
          </div>
          <Button asChild className="ml-auto">
            <Link to="/graph/assess">{t('checkout.continue')}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Required key backup before any payment (only when we can present the key —
  // i.e. a local nsec identity that is not yet backed up).
  const needsBackup = identity?.backed_up === false;
  if (needsBackup && activeNsec && !backupDone) {
    return (
      <Card className="bg-card/60">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl">{t('checkout.backup_title')}</h2>
          </div>
          <p className="text-sm text-muted-foreground">{t('checkout.backup_body')}</p>
        </CardHeader>
        <CardContent>
          <KeyBackup
            nsec={activeNsec.nsec}
            sk={activeNsec.sk}
            pubkey={activeNsec.pubkey}
            onComplete={async () => {
              setBackupDone(true);
              await refresh();
            }}
          />
        </CardContent>
      </Card>
    );
  }

  const s = checkout.state;
  const paying = s.phase === 'preparing' || s.phase === 'paying';
  const showInvoice = s.phase === 'invoice' && s.invoice;
  const paid = s.phase === 'paid';

  return (
    <Card className="bg-card/60">
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl">{product.name}</h2>
          <div className="text-right">
            {price && <p className="atlas-data text-2xl text-primary">{formatPrice(price)}</p>}
            <SatsLine
              sats={satsPrice.sats}
              stale={satsPrice.stale}
              asOf={satsPrice.rate?.as_of}
              source={satsPrice.rate?.source}
              loading={satsPrice.loading}
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{product.tagline}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* What unlocks */}
        <ul className="space-y-2">
          {product.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{t(f)}</span>
            </li>
          ))}
        </ul>

        {/* Public-receipt privacy warning (always honest; especially for anon). */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('checkout.receipt_warning_title')}</AlertTitle>
          <AlertDescription>{t('checkout.receipt_warning_body')}</AlertDescription>
        </Alert>

        {/* Payment state banners */}
        <PaymentStatus status={entitlement.status} paid={paid} />

        {s.phase === 'error' && s.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('checkout.failed_title')}</AlertTitle>
            <AlertDescription>{s.error}</AlertDescription>
          </Alert>
        )}

        {/* Invoice (manual / QR) */}
        {showInvoice && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-hairline bg-background p-5">
            <p className="text-sm text-muted-foreground">{t('checkout.scan')}</p>
            <div className="rounded-lg bg-white p-3">
              <QRCodeCanvas value={`lightning:${s.invoice}`} size={224} className="h-56 w-56" />
            </div>
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(s.invoice!);
                    toast({ title: t('checkout.copied') });
                  } catch {
                    toast({ title: t('invite.copy_failed'), variant: 'destructive' });
                  }
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                {t('checkout.copy_invoice')}
              </Button>
              <Button className="flex-1" onClick={() => entitlement.recheck()}>
                {t('checkout.check_again')}
              </Button>
            </div>
          </div>
        )}

        {/* Primary actions */}
        <div className="flex flex-wrap items-center gap-3">
          {!showInvoice && !paid && (
            <Button
              size="lg"
              disabled={paying || satsPrice.msat === null || checkout.providerLoading}
              onClick={() => void checkout.start()}
              className="gap-2"
            >
              {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {paying ? t('checkout.preparing') : t('checkout.pay')}
            </Button>
          )}

          {(paid || entitlement.status === 'awaiting' || entitlement.status === 'detected') && (
            <Button
              variant={paid ? 'default' : 'outline'}
              onClick={() => entitlement.recheck()}
              disabled={entitlement.loading}
              className="gap-2"
            >
              {entitlement.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('checkout.check_again')}
            </Button>
          )}

          {s.phase === 'error' && (
            <Button variant="outline" onClick={() => void checkout.start()}>
              {t('checkout.retry')}
            </Button>
          )}
        </div>

        {/* Support path */}
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t('checkout.support')}{' '}
          <Link to="/privacy-center" className="underline underline-offset-2 hover:text-foreground">
            {t('checkout.support_link')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function SatsLine({
  sats,
  stale,
  asOf,
  source,
  loading,
}: {
  sats: number | null;
  stale: boolean;
  asOf?: number;
  source?: string;
  loading: boolean;
}) {
  const { t } = useI18n();
  if (loading) return <p className="text-xs text-muted-foreground">{t('checkout.rate_loading')}</p>;
  if (sats === null) return <p className="text-xs text-muted-foreground">{t('checkout.rate_unavailable')}</p>;
  const when = asOf ? new Date(asOf * 1000).toLocaleTimeString() : '';
  return (
    <p className="text-xs text-muted-foreground">
      ≈ {sats.toLocaleString()} sats
      {asOf && (
        <>
          {' · '}
          <span title={source}>
            {stale ? t('checkout.rate_cached') : t('checkout.rate_asof')} {when}
          </span>
        </>
      )}
    </p>
  );
}

function PaymentStatus({
  status,
  paid,
}: {
  status: ReturnType<typeof useEntitlement>['status'];
  paid: boolean;
}) {
  const { t } = useI18n();
  if (status === 'verified') {
    return (
      <Alert className="border-primary/40 bg-primary/5">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <AlertTitle>{t('checkout.state.verified_title')}</AlertTitle>
        <AlertDescription>{t('checkout.state.verified_body')}</AlertDescription>
      </Alert>
    );
  }
  if (status === 'detected' || paid) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>{t('checkout.state.detected_title')}</AlertTitle>
        <AlertDescription>{t('checkout.state.detected_body')}</AlertDescription>
      </Alert>
    );
  }
  if (status === 'failed') {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t('checkout.state.failed_title')}</AlertTitle>
        <AlertDescription>{t('checkout.state.failed_body')}</AlertDescription>
      </Alert>
    );
  }
  return null;
}

function Gate({
  body,
  icon,
  children,
}: {
  body: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Card className="border-dashed bg-card/40">
      <CardContent className="space-y-5 px-8 py-12 text-center">
        {icon && (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-hairline bg-background">
            {icon}
          </div>
        )}
        <p className={cn('text-muted-foreground')}>{body}</p>
        {children}
      </CardContent>
    </Card>
  );
}
