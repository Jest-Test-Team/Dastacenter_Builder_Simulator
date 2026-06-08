/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.posthog.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://cdn.credly.com https://images.credly.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.posthog.com wss://*.posthog.com https://*.walletconnect.com wss://*.walletconnect.org https://*.alchemy.com https://*.infura.io https://api.mainnet-beta.solana.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react', '@react-three/drei'],
  },
  transpilePackages: ['three'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.credly.com' },
      { protocol: 'https', hostname: 'images.credly.com' },
    ],
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      type: 'asset/source',
    });

    // Ignore optional dependencies that WalletConnect/pino tries to load
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'pino-pretty': false,
      encoding: false,
    };

    // Ignore node-specific modules in client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };

      // Cloudflare Workers Assets cannot serve files whose path contains
      // square brackets. Next names per-route client chunks after the route
      // (e.g. app/build/[scenarioId]/page-<hash>.js); the webpack runtime then
      // requests them URL-encoded (%5B…%5D), which never matches the raw
      // bracket path on disk -> 404 -> ChunkLoadError on every dynamic route.
      // Strip brackets from the chunk name so the emitted filename and the
      // runtime request URL are both bracket-free and match.
      const sanitize = (tmpl) => (pathData, assetInfo) => {
        const name = pathData && pathData.chunk && pathData.chunk.name;
        if (name && /[[\]]/.test(name)) {
          pathData.chunk.name = name.replace(/[[\]]/g, '_');
        }
        return typeof tmpl === 'function' ? tmpl(pathData, assetInfo) : tmpl;
      };
      config.output.chunkFilename = sanitize(config.output.chunkFilename);
    }

    return config;
  },
  // Aggressive chunk splitting for smaller per-route bundles
  async optimizeModules() {
    return {
      react: { unstable_runtimeMemoize: true },
    };
  },
};

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
