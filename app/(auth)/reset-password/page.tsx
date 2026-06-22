/**
 * Reset Password Page
 *
 * Client component reached via the link in a Supabase password-reset email.
 * Collects a new password (with confirmation) and updates the authenticated
 * user&apos;s credentials via Supabase, then redirects to /dashboard.
 *
 * @module ResetPasswordPage
 */
'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Loader2, Lock, Eye, EyeOff } from 'lucide-react';
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

export default function ResetPasswordPage() {
  const { addToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      const msg = 'Password must be at least 8 characters.';
      setError(msg);
      addToast({ title: 'Validation error', description: msg, type: 'error' });
      return;
    }
    if (password !== confirm) {
      const msg = 'Passwords do not match.';
      setError(msg);
      addToast({ title: 'Validation error', description: msg, type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabaseBrowser.auth.updateUser({ password });
      if (updateError) throw updateError;
      addToast({
        title: 'Password updated',
        description: 'Your password has been changed successfully.',
        type: 'success',
      });
      window.location.href = '/dashboard';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update password.';
      setError(message);
      addToast({ title: 'Update failed', description: message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Reset password</CardTitle>
        <CardDescription>Choose a new password for your DataCore AI account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* New password */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              New password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="pl-9 pr-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div className="space-y-2">
            <label htmlFor="confirm" className="text-sm font-medium text-slate-700">
              Confirm new password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className="pl-9"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update password
          </Button>

          <div className="text-center text-sm text-slate-600">
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Back to login
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
