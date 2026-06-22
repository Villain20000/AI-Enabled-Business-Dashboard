/**
 * AuthForm — reusable authentication form.
 *
 * Renders email/password (and confirm-password in signup mode) fields and
 * delegates Supabase auth calls to the shared browser client. Also provides
 * OAuth sign-in buttons (Google, GitHub) and contextual navigation links.
 *
 * @module AuthForm
 */
'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
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

type AuthMode = 'login' | 'signup';

interface AuthFormProps {
  /** Whether the form signs users in (login) or creates accounts (signup). */
  mode: AuthMode;
}

/** Basic email format check. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthForm({ mode }: AuthFormProps) {
  const { addToast } = useToast();
  const isSignup = mode === 'signup';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Validate fields before submission. Returns an error message string or
   * null when inputs are valid.
   */
  function validate(): string | null {
    if (!EMAIL_REGEX.test(email)) return 'Please enter a valid email address.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (isSignup && password !== confirm) return 'Passwords do not match.';
    return null;
  }

  /** Handle email/password submit (login or signup). */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      addToast({ title: 'Validation error', description: validationError, type: 'error' });
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        const { error: signUpError } = await supabaseBrowser.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        addToast({
          title: 'Account created',
          description: 'Check your inbox to confirm your email, then sign in.',
          type: 'success',
        });
      } else {
        const { error: signInError } = await supabaseBrowser.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        addToast({ title: 'Signed in', description: 'Welcome back to DataCore AI.', type: 'success' });
      }
      // Hard redirect to dashboard after successful auth.
      window.location.href = '/dashboard';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
      addToast({ title: 'Authentication failed', description: message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  /** Trigger an OAuth sign-in flow for the given provider. */
  async function handleOAuth(provider: 'google' | 'github') {
    setError(null);
    setOauthLoading(provider);
    try {
      const { error: oauthError } = await supabaseBrowser.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (oauthError) throw oauthError;
      // Browser will redirect to the provider; nothing else to do here.
    } catch (err) {
      const message = err instanceof Error ? err.message : `${provider} sign-in failed.`;
      setError(message);
      addToast({ title: 'OAuth error', description: message, type: 'error' });
      setOauthLoading(null);
    }
  }

  const busy = loading || oauthLoading !== null;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">{isSignup ? 'Create your account' : 'Welcome back'}</CardTitle>
        <CardDescription>
          {isSignup
            ? 'Start turning your business data into AI-driven decisions.'
            : 'Sign in to your DataCore AI workspace to continue.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Email */}
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
                disabled={busy}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                placeholder="At least 8 characters"
                className="pl-9 pr-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
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

          {/* Confirm password (signup only) */}
          {isSignup && (
            <div className="space-y-2">
              <label htmlFor="confirm" className="text-sm font-medium text-slate-700">
                Confirm password
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
                  disabled={busy}
                  required
                />
              </div>
            </div>
          )}

          {/* Inline error */}
          {error && <p className="text-sm text-rose-600">{error}</p>}

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={busy}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSignup ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs uppercase tracking-wide text-slate-400">or</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {/* OAuth providers */}
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => handleOAuth('google')}
          >
            {oauthLoading === 'google' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
            )}
            Continue with Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => handleOAuth('github')}
          >
            {oauthLoading === 'github' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.02c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.23 1.92 1.23 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
              </svg>
            )}
            Continue with GitHub
          </Button>
        </div>

        {/* Contextual links */}
        <div className="mt-6 flex flex-col items-center gap-2 text-sm text-slate-600">
          {isSignup ? (
            <p>
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
                Log in
              </Link>
            </p>
          ) : (
            <>
              <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-700">
                Forgot password?
              </Link>
              <p>
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-700">
                  Sign up
                </Link>
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
