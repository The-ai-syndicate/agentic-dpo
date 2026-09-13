/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // WARNING: build errors are currently ignored. This lets type errors ship to
    // production. Remove this (or set to false) once the codebase type-checks
    // cleanly, so `next build` fails on real type regressions.
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  transpilePackages: ['recharts'],
  // The local embedding stack (@xenova/transformers + onnxruntime-node) loads
  // native binaries (.node) and model files at runtime. Keep them external to
  // the server bundle and ensure they ship with the serverless functions.
  serverExternalPackages: ['@xenova/transformers', 'onnxruntime-node', 'sharp'],
  outputFileTracingIncludes: {
    '/api/chat': [
      './node_modules/@xenova/transformers/**/*',
      './node_modules/onnxruntime-node/**/*',
      './models/**/*',
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Robots-Tag', value: 'index, follow' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'X-Download-Options', value: 'noopen' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
    ]
  },
  async redirects() {
    return []
  },
}

export default nextConfig
