/**
 * Login Page
 *
 * Server component that renders the shared AuthForm in login mode and
 * preserves a safe post-auth redirect (used by invite acceptance).
 *
 * @module LoginPage
 */
import AuthForm from '@/components/auth/AuthForm';

function safeRedirect(value: string | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect, error } = await searchParams;
  return (
    <AuthForm
      mode="login"
      redirectTo={safeRedirect(redirect)}
      initialError={error}
    />
  );
}
