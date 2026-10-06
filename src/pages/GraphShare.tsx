import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { Check, Copy, Download, Loader2, Share2 } from 'lucide-react';
import { AtlasLayout } from '@/components/shell/AtlasLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useVault } from '@/hooks/useVault';
import { useI18n } from '@/hooks/useI18n';
import { useToast } from '@/hooks/useToast';
import { useReferral } from '@/hooks/useReferral';
import { InvitePanel } from '@/components/referral/InvitePanel';
import {
  buildShareCardSvg,
  renderShareCard,
  type ShareInclude,
} from '@/lib/shareCard';

export default function GraphShare() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { state, currentGraph, unlock } = useVault();

  const [include, setInclude] = useState<ShareInclude>('figure');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useSeoMeta({
    title: `${t('page.share.title')} · ${t('app.name')}`,
    description: t('page.share.body'),
  });

  useEffect(() => {
    if (user && state === 'locked') void unlock();
  }, [user, state, unlock]);

  const tagline = t('app.tagline');
  // The owner's own referral link is stamped onto the share card so every share
  // carries first-touch attribution (Phase I records it; Phase VII pays it).
  const { link: referralHref } = useReferral();
  const refLink = referralHref ?? undefined;

  // Live preview SVG (data URL) that mirrors the exported PNG exactly.
  const previewUrl = useMemo(() => {
    if (!currentGraph) return null;
    const svg = buildShareCardSvg(currentGraph, { include, referralLink: refLink, tagline });
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [currentGraph, include, refLink, tagline]);

  const makeBlob = useCallback(async () => {
    if (!currentGraph) return null;
    return renderShareCard(currentGraph, { include, referralLink: refLink, tagline });
  }, [currentGraph, include, refLink, tagline]);

  const onShare = useCallback(async () => {
    setBusy(true);
    try {
      const blob = await makeBlob();
      if (!blob) return;
      const file = new File([blob], 'soulgraph.png', { type: 'image/png' });

      const canShareFiles =
        typeof navigator !== 'undefined' &&
        'canShare' in navigator &&
        navigator.canShare?.({ files: [file] });

      if (canShareFiles && navigator.share) {
        await navigator.share({ files: [file], title: t('app.name'), text: tagline });
      } else {
        // Fallback: download + copy link.
        downloadBlob(blob);
        toast({ title: t('share.downloaded'), description: t('share.downloaded_desc') });
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error('Share failed:', err);
        toast({ title: t('share.error'), variant: 'destructive' });
      }
    } finally {
      setBusy(false);
    }
  }, [makeBlob, t, tagline, toast]);

  const onDownload = useCallback(async () => {
    setBusy(true);
    try {
      const blob = await makeBlob();
      if (blob) downloadBlob(blob);
    } catch (err) {
      console.error('Download failed:', err);
      toast({ title: t('share.error'), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }, [makeBlob, t, toast]);

  const onCopyLink = useCallback(async () => {
    if (!refLink) return;
    try {
      await navigator.clipboard.writeText(refLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: t('share.error'), variant: 'destructive' });
    }
  }, [refLink, t, toast]);

  const OPTIONS: { value: ShareInclude; label: string }[] = [
    { value: 'figure', label: t('share.include.figure') },
    { value: 'figure_enneagram', label: t('share.include.enneagram') },
    { value: 'figure_code', label: t('share.include.code') },
  ];

  return (
    <AtlasLayout>
      <div className="atlas-grid-bg border-b border-hairline">
        <div className="container px-4 py-14 sm:px-6 sm:py-20">
          <p className="atlas-label mb-4">{t('nav.graph')}</p>
          <h1 className="font-display text-4xl leading-[1.1] sm:text-5xl">{t('page.share.title')}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {t('page.share.body')}
          </p>
        </div>
      </div>

      <div className="container px-4 py-12 sm:px-6 sm:py-16">
        {!currentGraph ? (
          <Card className="mx-auto max-w-xl border-dashed bg-card/40">
            <CardContent className="space-y-5 px-8 py-12 text-center">
              <p className="text-muted-foreground">{t('graph.empty.body')}</p>
              <Button asChild size="lg">
                <Link to="/begin">{t('graph.empty.cta')}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-start">
            {/* Preview */}
            <div className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-hairline shadow-lg">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt={t('share.preview_alt')}
                  className="block w-full"
                  style={{ aspectRatio: '1080 / 1350' }}
                />
              )}
            </div>

            {/* Controls */}
            <div className="space-y-8">
              <div>
                <h2 className="font-display text-xl">{t('share.include.title')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('share.include.note')}</p>
                <RadioGroup
                  value={include}
                  onValueChange={(v) => setInclude(v as ShareInclude)}
                  className="mt-4 space-y-3"
                >
                  {OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-3">
                      <RadioGroupItem value={opt.value} id={`inc-${opt.value}`} />
                      <Label htmlFor={`inc-${opt.value}`} className="cursor-pointer text-base">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={onShare} disabled={busy}>
                  {busy ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Share2 className="mr-1 h-4 w-4" />
                  )}
                  {t('share.action.share')}
                </Button>
                <Button variant="outline" onClick={onDownload} disabled={busy}>
                  <Download className="mr-1 h-4 w-4" />
                  {t('share.action.download')}
                </Button>
                <Button variant="ghost" onClick={onCopyLink}>
                  {copied ? (
                    <Check className="mr-1 h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="mr-1 h-4 w-4" />
                  )}
                  {t('share.action.copy')}
                </Button>
              </div>

              <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
                {t('share.privacy_note')}
              </p>

              <InvitePanel />
            </div>
          </div>
        )}
      </div>
    </AtlasLayout>
  );
}

function downloadBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'soulgraph.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
