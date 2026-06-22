/**
 * Login Page
 *
 * Server component that renders the shared AuthForm in login mode within
 * the (auth) route group layout.
 *
 * @module LoginPage
 */
import AuthForm from '@/components/auth/AuthForm';

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
