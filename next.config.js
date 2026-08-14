/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.posthog.com https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://cdn.credly.com https://images.credly.com",
      "font-src 'self' data:",
      // connect-src must list every host the app can dial: analytics, wallet
      // infra, and the JSON-RPC endpoint of every chain in lib/sbt/chains.ts +
      // lib/wallet/wagmi.ts. A missing host shows up as a "violates the
      // document's Content Security Policy" console error and a dead wallet
      // read/mint precheck, so the chain RPCs and Coinbase Wallet's telemetry
      // (cca-lite.coinbase.com) are enumerated here.
      [
        "connect-src 'self'",
        // bb.js (the in-browser ZK prover) ships its Barretenberg WASM inlined
        // as a gzipped `data:` URL and fetches it at prove time; its worker pool
        // uses `blob:`. Without these the fetch is blocked and proving fails
        // with "Failed to fetch" at "Requesting threshold proof from prover…".
        'data: blob:',
        'https://*.posthog.com wss://*.posthog.com https://cloudflareinsights.com',
        'https://*.walletconnect.com wss://*.walletconnect.org https://*.coinbase.com https://cca-lite.coinbase.com https://*.walletlink.org wss://*.walletlink.org',
        'https://*.alchemy.com https://*.infura.io https://api.mainnet-beta.solana.com',
        // Chain RPC endpoints (EVM SBT chains).
        'https://*.rpc.thirdweb.com https://*.polygon.technology https://polygon-rpc.com',
        'https://*.llamarpc.com https://eth.llamarpc.com https://*.binance.org',
        'https://*.arbitrum.io https://mainnet.optimism.io https://*.optimism.io https://*.base.org',
        'https://*.drpc.org https://*.publicnode.com https://*.merkle.io',
      ].join(' '),
      // bb.js may run its prover in a worker created from a blob: URL; without
      // this it falls back to default-src 'self' and the worker is blocked.
      "worker-src 'self' blob:",
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
  // The Noir prover's WASM must be required from node_modules at runtime, not
  // bundled. Bundling rewrites the .wasm to a /_next/static/... asset URL, and
  // the loader then tries to fetch that relative path from the server, where
  // there is no origin to resolve it against ("Failed to parse URL from ...").
  serverExternalPackages: [
    '@noir-lang/noir_js',
    '@noir-lang/noirc_abi',
    '@noir-lang/acvm_js',
    '@aztec/bb.js',
  ],
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
  async rewrites() {
    return [
      { source: '/build/free', destination: '/build' },
      { source: '/build/index', destination: '/build' },
    ];
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
    }

    return config;
  },
};

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
