/**
 * Next.js Configuration File
 * 
 * This file configures the Next.js application with various settings including:
 * - React strict mode for development
 * - ESLint and TypeScript settings
 * - Image optimization domains
 * - Webpack customizations
 * 
 * @see https://nextjs.org/docs/app/api-reference/config/next-config
 */
import type {NextConfig} from 'next';

/**
 * Next.js configuration object
 * Contains all the settings for building and running the Next.js application
 */
const nextConfig: NextConfig = {
  // Enable React strict mode to help find potential problems in components
  reactStrictMode: true,
  
  // ESLint configuration during builds
  eslint: {
    // Ignore ESLint errors during production builds
    ignoreDuringBuilds: true,
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
};

export default nextConfig;
