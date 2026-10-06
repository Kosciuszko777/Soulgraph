import { useState } from 'react';
import { Loader2, UserPlus, KeyRound, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthDialog from '@/components/auth/AuthDialog';
import { KeyBackup } from '@/components/identity/KeyBackup';
import { SoulGraphMark } from '@/components/brand/SoulGraphMark';
import { useIdentityActions } from '@/hooks/useIdentityActions';
import type { GeneratedKey } from '@/core/identity/keys';
import { toast } from '@/hooks/useToast';

/**
 * Onboarding offers two paths with EQUAL visual weight:
 *   1. Create anonymous SoulGraph (browser keypair → required Key Backup).
 *   2. Sign in with Nostr (reuses the MKStack AuthDialog: NIP-07 / NIP-46 / nsec).
 *
 * See docs/ARCHITECTURE.md §6.
 */
export function Onboarding({ onDone }: { onDone?: () => void }) {
  const { createAnonymous } = useIdentityActions();
  const [creating, setCreating] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [generated, setGenerated] = useState<GeneratedKey | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const handleCreateAnonymous = async () => {
    setCreating(true);
    try {
      const key = await createAnonymous(displayName.trim() || undefined);
      setGenerated(key);
    } catch (err) {
      console.error(err);
      toast({ title: 'Could not create identity', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  // Key backup step (required before payment/sync).
  if (generated) {
    return (
      <Card className="mx-auto max-w-xl bg-card/60">
        <CardHeader>
          <p className="atlas-label">Step 2 of 2</p>
          <h2 className="font-display text-2xl">Back up your key</h2>
        </CardHeader>
        <CardContent>
          <KeyBackup
            nsec={generated.nsec}
            sk={generated.sk}
            pubkey={generated.pubkey}
            onComplete={() => {
              setGenerated(null);
              onDone?.();
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mb-5 flex justify-center">
            <SoulGraphMark className="h-10 w-10 text-foreground" />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl">Create your SoulGraph</h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Choose how you want to own your map. Both paths keep your key in your hands —
            there is no server, and no email.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Path 1 — anonymous */}
          <Card className="flex flex-col bg-card/60">
            <CardHeader>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-hairline bg-background">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-3 font-display text-xl">Create anonymous SoulGraph</h3>
              <p className="text-sm text-muted-foreground">
                Generate a fresh key in your browser. Nothing links it to your name.
              </p>
            </CardHeader>
            <CardContent className="mt-auto space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="onb-name" className="text-sm">Display name (optional)</Label>
                <Input
                  id="onb-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How SoulGraph greets you"
                  maxLength={80}
                />
              </div>
              <Button onClick={handleCreateAnonymous} disabled={creating} className="w-full gap-2">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {creating ? 'Generating key…' : 'Create & back up'}
              </Button>
            </CardContent>
          </Card>

          {/* Path 2 — sign in with Nostr */}
          <Card className="flex flex-col bg-card/60">
            <CardHeader>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-hairline bg-background">
                <KeyRound className="h-5 w-5 text-cyan" />
              </div>
              <h3 className="mt-3 font-display text-xl">Sign in with Nostr</h3>
              <p className="text-sm text-muted-foreground">
                Use a browser extension (NIP-07) or a remote signer (NIP-46). Your key never leaves your signer.
              </p>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button variant="outline" onClick={() => setAuthOpen(true)} className="w-full gap-2">
                <KeyRound className="h-4 w-4" /> Sign in with Nostr
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <AuthDialog
        isOpen={authOpen}
        onClose={() => {
          setAuthOpen(false);
          onDone?.();
        }}
      />
    </>
  );
}
