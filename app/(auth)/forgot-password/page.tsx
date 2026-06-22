/**
 * Forgot Password Page
 *
 * Client component that collects an email address and triggers a Supabase
 * password-reset email. On success, shows a confirmation message and toast;
 * inline errors are surfaced on failure.
 *
 * @module ForgotPasswordPage
 */
'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/toast-context';
import { supabaseBrowser } from '@/lib/supabase/client';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!EMAIL_REGEX.test(email)) {
      const msg = 'Please enter a valid email address.';
      setError(msg);
      addToast({ title: 'Validation error', description: msg, type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setSent(true);
      addToast({
        title: 'Reset email sent',
        description: 'Check your inbox for a link to reset your password.',
        type: 'success',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to send reset email.';
      setError(message);
      addToast({ title: 'Request failed', description: message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Forgot password</CardTitle>
        <CardDescription>
          Enter the email associated with your account and we&apos;ll send you a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              If an account exists for <span className="font-medium text-slate-900">{email}</span>,
              a password reset link is on its way. Please check your inbox and spam folder.
            </p>
            <Link
              href="/login"
              className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send reset link
            </Button>

            <div className="text-center text-sm text-slate-600">
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
                Back to login
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
