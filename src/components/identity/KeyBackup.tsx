import { useState } from 'react';
import { Copy, Download, Eye, EyeOff, Check, ShieldCheck, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/useToast';
import { encryptToNcryptsec } from '@/core/identity/keys';
import { markBackedUp, appendAudit } from '@/core/vault/vault';
import { usePassphraseLock } from '@/hooks/usePassphraseLock';
import { cn } from '@/lib/utils';

interface KeyBackupProps {
  /** The nsec to back up (shown behind a reveal). */
  nsec: string;
  /** The owner pubkey — marked backed-up in the vault on completion. */
  pubkey: string;
  /** Raw secret key, needed for the NIP-49 export. */
  sk: Uint8Array;
  /** Called once the user confirms they have saved their key. */
  onComplete: () => void;
}

/**
 * The required Key Backup step. Explains in two sentences why the key matters,
 * reveals the nsec, offers copy/download, and offers an NIP-49 ncryptsec export
 * protected by a passphrase. Must be completed before any payment or sync.
 */
export function KeyBackup({ nsec, pubkey, sk, onComplete }: KeyBackupProps) {
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [exported, setExported] = useState(false);
  const [useAsLock, setUseAsLock] = useState(false);
  const { enableLock } = usePassphraseLock();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(nsec);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: 'Copy failed', description: 'Copy the key manually.', variant: 'destructive' });
    }
  };

  const downloadBlob = (contents: string, filename: string) => {
    const blob = new Blob([contents], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const downloadNsec = () => {
    downloadBlob(nsec, `soulgraph-key-${pubkey.slice(0, 8)}.nsec.txt`);
  };

  const exportNcryptsec = () => {
    if (passphrase.length < 8) {
      toast({ title: 'Passphrase too short', description: 'Use at least 8 characters.', variant: 'destructive' });
      return;
    }
    if (passphrase !== confirm) {
      toast({ title: 'Passphrases do not match', variant: 'destructive' });
      return;
    }
    try {
      const ncryptsec = encryptToNcryptsec(sk, passphrase);
      downloadBlob(ncryptsec, `soulgraph-key-${pubkey.slice(0, 8)}.ncryptsec.txt`);
      setExported(true);
      toast({ title: 'Encrypted backup downloaded', description: 'Keep both the file and your passphrase safe.' });
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    }
  };

  const complete = async () => {
    await markBackedUp(pubkey);
    await appendAudit(pubkey, 'identity.backed_up');
    // If the user opted into a passphrase lock, enable it now. This replaces the
    // plaintext nsec login with an ncryptsec unlocked each session.
    if (useAsLock) {
      if (passphrase.length < 8 || passphrase !== confirm) {
        toast({
          title: 'Set a matching passphrase first',
          description: 'A passphrase lock needs the passphrase fields above filled in and matching.',
          variant: 'destructive',
        });
        return;
      }
      try {
        await enableLock(nsec, passphrase);
        toast({ title: 'Passphrase lock enabled', description: 'You will unlock with this passphrase each session.' });
      } catch {
        toast({ title: 'Could not enable passphrase lock', variant: 'destructive' });
        return;
      }
    }
    onComplete();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm leading-relaxed text-foreground">
          This key is your SoulGraph. Lose it and nobody — including us — can recover your map.
          Save it somewhere only you can reach.
        </p>
      </div>

      {/* Reveal + copy + download */}
      <div className="space-y-2">
        <Label htmlFor="nsec-field" className="atlas-label">Your secret key (nsec)</Label>
        <div className="relative">
          <Input
            id="nsec-field"
            type={reveal ? 'text' : 'password'}
            value={nsec}
            readOnly
            className="pr-24 font-mono text-sm"
          />
          <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
            <Button type="button" variant="ghost" size="icon" aria-label={reveal ? 'Hide key' : 'Reveal key'} onClick={() => setReveal((v) => !v)}>
              {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label="Copy key" onClick={copy}>
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={downloadNsec} className="gap-2">
          <Download className="h-4 w-4" /> Download key file
        </Button>
      </div>

      {/* NIP-49 encrypted export */}
      <div className="space-y-3 rounded-lg border border-hairline p-4">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-cyan" />
          <h3 className="font-medium">Encrypted backup (recommended)</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Protect your key with a passphrase (NIP-49). The downloaded file is useless to anyone without it.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ncs-pass" className="text-sm">Passphrase</Label>
            <Input id="ncs-pass" type="password" value={passphrase} autoComplete="new-password"
              onChange={(e) => setPassphrase(e.target.value)} placeholder="At least 8 characters" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ncs-confirm" className="text-sm">Confirm</Label>
            <Input id="ncs-confirm" type="password" value={confirm} autoComplete="new-password"
              onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat passphrase" />
          </div>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={exportNcryptsec} className="gap-2">
          <Download className="h-4 w-4" />
          {exported ? 'Download encrypted backup again' : 'Download encrypted backup'}
        </Button>

        <div className="mt-2 flex items-center justify-between gap-4 rounded-md border border-hairline p-3">
          <div>
            <p className="text-sm font-medium">Also lock this device with the passphrase</p>
            <p className="text-xs text-muted-foreground">
              Stores your key only as ncryptsec here and asks for the passphrase each session.
            </p>
          </div>
          <Switch checked={useAsLock} onCheckedChange={setUseAsLock} aria-label="Enable passphrase lock" />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button onClick={complete} className={cn('gap-2')}>
          <Check className="h-4 w-4" /> I have saved my key
        </Button>
      </div>
    </div>
  );
}
