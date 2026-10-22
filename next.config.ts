/**
 * Next.js Configuration File
 *
 * This file configures the Next.js application with various settings including:
 * - React strict mode for development
 * - ESLint and TypeScript settings
 * - Image optimization domains
 * - Webpack customizations
 * - Security headers applied to all routes
 *
 * @see https://nextjs.org/docs/app/api-reference/config/next-config
 */
import type {NextConfig} from 'next';

/**
 * Security headers applied to every route.
 * These mitigate common web vulnerabilities (XSS, clickjacking, MIME sniffing,
 * protocol downgrade, etc.) and lock down the CSP to known-good origins.
 */
// Allow the browser to reach a self-hosted/local Supabase instance when the
// configured URL is not a *.supabase.co project (already covered by the
// wildcard). Production deployments using Supabase Cloud are unaffected.
const supabaseConnectSrc = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.hostname.endsWith('.supabase.co')) return '';
    return ` ${url.origin} ws://${url.host} wss://${url.host}`;
  } catch {
    return '';
  }
})();

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value:
      `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.stripe.com wss://*.supabase.co${supabaseConnectSrc}; frame-src https://js.stripe.com; base-uri 'self'; form-action 'self'`,
  },
  {key: 'X-Frame-Options', value: 'DENY'},
  {key: 'X-Content-Type-Options', value: 'nosniff'},
  {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
  {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()'},
  {key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains'},
  {key: 'X-DNS-Prefetch-Control', value: 'off'},
];

/**
 * Next.js configuration object
 * Contains all the settings for building and running the Next.js application
 */
const nextConfig: NextConfig = {
  // Enable React strict mode to help find potential problems in components
  reactStrictMode: true,

  // ESLint configuration during builds
  eslint: {
    // CI runs ESLint explicitly; keep build failures for lint errors too.
    ignoreDuringBuilds: false,
  },

  // TypeScript configuration
  typescript: {
    // Do NOT ignore TypeScript errors during builds (set to true to ignore)
    ignoreBuildErrors: false,
  },

  // Allow access to remote image placeholder.
  // This configuration enables loading images from external domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        // This allows any path under the hostname for placeholder images
        pathname: '/**',
      },
    ],
  },

  // Output standalone build for better optimization
  // Creates a separate output directory with optimized assets
  output: 'standalone',

  // Transpile specific packages that may not work with Server Components
  // 'motion' is transpiled to support animations in the app
  transpilePackages: ['motion'],

  // Custom webpack configuration
  // Used for special handling during development
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    // This ensures stable development experience in the AI Studio environment
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },

  // Apply security headers to all routes.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
