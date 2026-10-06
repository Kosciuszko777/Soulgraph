import { useState } from 'react';
import { Check, Copy, Gift } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QRCodeCanvas } from '@/components/ui/qrcode';
import { useReferral } from '@/hooks/useReferral';
import { useI18n } from '@/hooks/useI18n';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

/**
 * A simple Invite panel. Shows the user's referral link + QR, with the honest
 * Phase I message that rewards launch later and invitations are already being
 * counted. Renders nothing when logged out (no identity → no referral code).
 */
export function InvitePanel({ className }: { className?: string }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { link, shortCode, attributedCount } = useReferral();
  const [copied, setCopied] = useState(false);

  if (!link) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast({ title: t('invite.copy_failed'), variant: 'destructive' });
    }
  };

  return (
    <Card className={cn('bg-card/60', className)}>
      <CardHeader className="gap-2">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl">{t('invite.title')}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{t('invite.body')}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="rounded-xl border border-hairline bg-background p-3">
            <QRCodeCanvas value={link} size={128} className="h-32 w-32" />
          </div>
          <div className="w-full space-y-3">
            <div className="flex gap-2">
              <Input readOnly value={link} className="font-mono text-xs" aria-label={t('invite.link_label')} />
              <Button type="button" variant="outline" size="icon" onClick={copy} aria-label={t('invite.copy')}>
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            {shortCode && (
              <p className="text-xs text-muted-foreground">
                {t('invite.code_label')} <span className="font-mono">{shortCode}</span>
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-hairline bg-muted/30 p-4">
          <p className="text-sm text-foreground">{t('invite.rewards_soon')}</p>
          {attributedCount !== null && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t('invite.attributed_prefix')} {attributedCount}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
