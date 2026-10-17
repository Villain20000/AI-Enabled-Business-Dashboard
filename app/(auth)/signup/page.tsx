/**
 * Signup Page
 *
 * Server component that renders the shared AuthForm in signup mode and
 * preserves a safe post-auth redirect (used by invite acceptance).
 *
 * @module SignupPage
 */
import AuthForm from '@/components/auth/AuthForm';

function safeRedirect(value: string | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  return <AuthForm mode="signup" redirectTo={safeRedirect(redirect)} />;
}
