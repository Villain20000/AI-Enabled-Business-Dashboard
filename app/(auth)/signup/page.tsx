/**
 * Signup Page
 *
 * Server component that renders the shared AuthForm in signup mode within
 * the (auth) route group layout.
 *
 * @module SignupPage
 */
import AuthForm from '@/components/auth/AuthForm';

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
