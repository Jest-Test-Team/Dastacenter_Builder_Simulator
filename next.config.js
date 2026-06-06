/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', '@react-three/drei'],
  },
  transpilePackages: ['three'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.credly.com' },
      { protocol: 'https', hostname: 'images.credly.com' },
    ],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      type: 'asset/source',
    });
    return config;
  },
};

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
