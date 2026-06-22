/**
 * Accept Team Invite Page
 *
 * Client component rendered at /accept-invite/[token]. On mount it POSTs the
 * token to the team invite API. If the caller is not authenticated, the API
 * is expected to return a 401 and we prompt the user to sign in first (with a
 * redirect back to this page). On success we link to /dashboard.
 *
 * @module AcceptInvitePage
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/toast-context';

type Status = 'loading' | 'success' | 'unauthenticated' | 'error';

interface InviteResult {
  status: Status;
  message?: string;
}

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const { addToast } = useToast();
  const [state, setState] = useState<InviteResult>({ status: 'loading' });

  useEffect(() => {
    if (!token) {
      setState({ status: 'error', message: 'No invite token was provided in the URL.' });
      return;
    }

    let cancelled = false;

    async function acceptInvite() {
      try {
        const res = await fetch('/api/team/accept-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (cancelled) return;

        if (res.status === 401) {
          setState({
            status: 'unauthenticated',
            message: 'You need to be signed in to accept a team invitation.',
          });
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || data.message || `Request failed (${res.status}).`);
        }

        setState({ status: 'success' });
        addToast({
          title: 'Invite accepted',
          description: 'You have joined the team. Welcome aboard!',
          type: 'success',
        });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Unable to accept the invitation.';
        setState({ status: 'error', message });
        addToast({ title: 'Invite failed', description: message, type: 'error' });
      }
    }

    acceptInvite();
    return () => {
      cancelled = true;
    };
  }, [token, addToast]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Accept team invitation</CardTitle>
        <CardDescription>
          {state.status === 'loading'
            ? 'Verifying your invitation...'
            : 'Review your invitation status below.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state.status === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-6 text-slate-600">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm">Accepting your invitation, please wait...</p>
          </div>
        )}

        {state.status === 'success' && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            <p className="text-sm text-slate-700">
              You&apos;ve successfully joined the team. Head to your dashboard to get started.
            </p>
            <Link href="/dashboard">
              <Button>Go to dashboard</Button>
            </Link>
          </div>
        )}

        {state.status === 'unauthenticated' && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <LogIn className="h-10 w-10 text-blue-600" />
            <p className="text-sm text-slate-700">
              {state.message ?? 'You need to be signed in to accept a team invitation.'}
            </p>
            <Link href={`/login?redirect=accept-invite/${token}`}>
              <Button>Sign in to continue</Button>
            </Link>
          </div>
        )}

        {state.status === 'error' && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <AlertCircle className="h-10 w-10 text-rose-600" />
            <p className="text-sm text-slate-700">
              {state.message ?? 'This invitation could not be accepted.'}
            </p>
            <Link href="/login">
              <Button variant="outline">Back to login</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
