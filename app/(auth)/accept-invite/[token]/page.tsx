/**
 * Accept Team Invite Page
 *
 * Client component rendered at /accept-invite/[token]. It first validates the
 * token without consuming it, then lets the authenticated invitee explicitly
 * accept. Unauthenticated visitors are sent to login/signup with a redirect
 * back to this exact invitation.
 *
 * @module AcceptInvitePage
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/toast-context';
import { apiFetch } from '@/lib/api/client';

type Status = 'loading' | 'ready' | 'submitting' | 'success' | 'unauthenticated' | 'error';

interface InviteDetails {
  email: string;
  role: string;
  expiresAt: string;
  orgName: string;
}

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const { addToast } = useToast();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteDetails | null>(null);

  const redirectPath = token ? `/accept-invite/${token}` : '/dashboard';

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No invite token was provided in the URL.');
      return;
    }

    let cancelled = false;

    async function validate() {
      try {
        const res = await apiFetch(
          `/api/team/invite/validate?token=${encodeURIComponent(token)}`,
          { method: 'GET' },
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (res.status === 401) {
          setStatus('unauthenticated');
          return;
        }
        if (!res.ok) {
          throw new Error(data.error || `Request failed (${res.status}).`);
        }

        setInvite(data.invitation as InviteDetails);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Unable to load the invitation.');
      }
    }

    validate();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const accept = useCallback(async () => {
    if (!token) return;
    setStatus('submitting');
    setMessage(null);
    try {
      const res = await apiFetch('/api/team/accept-invite', {
        method: 'POST',
        json: { token },
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setStatus('unauthenticated');
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status}).`);
      }

      setStatus('success');
      addToast({
        title: 'Invite accepted',
        description: `You have joined ${invite?.orgName ?? 'the team'}.`,
        type: 'success',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unable to accept the invitation.';
      setStatus('error');
      setMessage(errorMessage);
      addToast({ title: 'Invite failed', description: errorMessage, type: 'error' });
    }
  }, [addToast, invite?.orgName, token]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Accept team invitation</CardTitle>
        <CardDescription>
          {status === 'loading'
            ? 'Verifying your invitation...'
            : 'Review your invitation status below.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-6 text-slate-600">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm">Checking your invitation...</p>
          </div>
        )}

        {(status === 'ready' || status === 'submitting' || status === 'success') && invite && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                You have been invited to join <span className="font-medium text-slate-900">{invite.orgName}</span>{' '}
                as <span className="font-medium capitalize text-slate-900">{invite.role}</span>.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Invitation for {invite.email} · expires{' '}
                {new Date(invite.expiresAt).toLocaleDateString()}
              </p>
            </div>

            {status === 'success' ? (
              <div className="flex flex-col items-center gap-4 py-2 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                <p className="text-sm text-slate-700">You are now a member of this organization.</p>
                <Link href="/dashboard">
                  <Button>Go to dashboard</Button>
                </Link>
              </div>
            ) : (
              <Button onClick={accept} disabled={status === 'submitting'} className="w-full">
                {status === 'submitting' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Accept invitation
              </Button>
            )}
          </div>
        )}

        {status === 'unauthenticated' && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <LogIn className="h-10 w-10 text-blue-600" />
            <p className="text-sm text-slate-700">
              Sign in or create an account with the invited email address to continue.
            </p>
            <div className="flex w-full flex-col gap-2">
              <Link href={`/login?redirect=${encodeURIComponent(redirectPath)}`}>
                <Button className="w-full">Sign in to continue</Button>
              </Link>
              <Link href={`/signup?redirect=${encodeURIComponent(redirectPath)}`}>
                <Button variant="outline" className="w-full">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create an account
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <AlertCircle className="h-10 w-10 text-rose-600" />
            <p className="text-sm text-slate-700">
              {message ?? 'This invitation could not be accepted.'}
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
