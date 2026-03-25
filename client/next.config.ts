import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Force le bundling webpack des packages supabase (ESM) côté serveur
  // pour que webpack polyfill __dirname — ne pas les externaliser
  transpilePackages: [
    '@supabase/supabase-js',
    '@supabase/ssr',
    '@supabase/realtime-js',
    '@supabase/functions-js',
    '@supabase/storage-js',
    '@supabase/auth-js',
    '@supabase/postgrest-js',
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Polyfill __dirname/__filename pour les modules bundlés en ESM
      config.node = {
        ...(config.node ?? {}),
        __dirname: true,
        __filename: true,
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

export default nextConfig;
