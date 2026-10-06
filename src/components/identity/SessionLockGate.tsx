import { useState, type ReactNode } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { SoulGraphMark } from '@/components/brand/SoulGraphMark';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePassphraseLock } from '@/hooks/usePassphraseLock';
import { toast } from '@/hooks/useToast';

/**
 * Gates the app when a passphrase lock is configured but no key is loaded for
 * the session. The decrypted key never persists — the user unlocks each session.
 */
export function SessionLockGate({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const { isLockConfigured, unlockSession, disableLock } = usePassphraseLock();
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);

  // Locked and nobody is signed in → show the unlock screen.
  const showGate = isLockConfigured && !user;

  if (!showGate) return <>{children}</>;

  const unlock = async () => {
    setBusy(true);
    try {
      const ok = await unlockSession(passphrase);
      if (!ok) {
        toast({ title: 'Wrong passphrase', variant: 'destructive' });
      } else {
        setPassphrase('');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="atlas-grid-bg flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm bg-card/70">
        <CardHeader className="items-center text-center">
          <div className="flex justify-center">
            <SoulGraphMark className="h-9 w-9 text-foreground" />
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <h1 className="font-display text-xl">SoulGraph is locked</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your passphrase to unlock your key for this session.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void unlock();
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="unlock-pass" className="sr-only">Passphrase</Label>
              <Input
                id="unlock-pass"
                type="password"
                autoFocus
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Passphrase"
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy || !passphrase}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
              Unlock
            </Button>
          </form>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => {
              if (confirm('Remove the passphrase lock on this device? You will need your nsec to sign in again.')) {
                disableLock();
              }
            }}
          >
            Forgot passphrase? Remove the lock
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
